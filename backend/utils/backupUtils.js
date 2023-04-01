const fs = require('fs');
const { spawn } = require('child_process');
const { ethers } = require('hardhat');
const { network } = require("../network");
const CID = require('cids');
const Readable = require('stream').Readable;

const backupObj = {
  name: "",
  fillArrayReady: false,
  copyToMFSReady: false,
  carExportReady: false,
  commPCalculationReady: false,
  dealRequestMade: false,
  dealPublished: false,
  dealAccepted: false,
  dealActive: false
};

const inProgressBackups = {};             // Object that contains backupObj's

// Start backup (create InProgress object)
async function startBackup(name, res) {
  console.log("IPFS-Backup started...");  
  const folderName = name;
  console.log("Folder: ", folderName);
  inProgressBackups[folderName] = Object.assign({}, backupObj);
  inProgressBackups[folderName].name = folderName;
  res.json({message: "IPFS-Backup started", folder: folderName});
  const { create, CID, globSource } = await import('kubo-rpc-client');
  const ipfs = create();          // Default, http://localhost:5001

  return { ipfs, CID, globSource, folderName};
}

// This will give back an array of CIDs, that are individual files or folders (not fragments of files)
async function fillArrayWithPinnedCIDs(ipfs, folderName) {
  console.log("Getting list of pinned content...")
  const pinList = await ipfs.pin.ls({type: "recursive"});
  let nextItem = null;
  let resultArray = [];

  do {
    nextItem = await pinList.next();
    if (!nextItem.done) resultArray.push(nextItem.value.cid)
  } while (!nextItem.done);

  inProgressBackups[folderName].fillArrayReady = true;
  return resultArray;
}

async function copyToMFS(ipfs, arrayOfCIDs, folderName) {
  console.log("Copying pinned content to MFS...");
  //console.log("arrayOfCIDs: ", arrayOfCIDs);
  await ipfs.files.mkdir("/" + folderName);

  for (let i = 0; i < arrayOfCIDs.length; i++) {
    await ipfs.files.cp("/ipfs/" + arrayOfCIDs[i].toString(), "/" + folderName + "/" + arrayOfCIDs[i].toString())
  }

  inProgressBackups[folderName].copyToMFSReady = true;
  console.log("All content copied to MFS.");
}

async function createCAR(ipfs, CID, folderName) {
  console.log("Statistics about the newly created backup folder: ");
  const stat = await ipfs.files.stat("/" + folderName);
  console.log(stat);
  const v0RootCID = await stat.cid;
  const rootCID = v0RootCID.toV1()
  const totalSize = stat.cumulativeSize;
  let copiedBytes = 0;
  inProgressBackups[folderName].payloadCID = rootCID.toString();
  inProgressBackups[folderName].cumulativeSize = stat.cumulativeSize;

  const exportResult = await ipfs.dag.export(rootCID);
  let buffer = {value: undefined, done: false};
  const fileName = folderName + ".car";
  if (fs.existsSync("./outputCARfiles/" + fileName)) {
    fs.unlinkSync("./outputCARfiles/" + fileName);
    console.log("Deleted old CAR file with the same name.");
  }

  console.log("Exporting data to a CAR file...");
  do {
    buffer = await exportResult.next();
    if (!buffer.done) {
      try {
        fs.appendFileSync("./outputCARfiles/" + fileName, buffer.value);
        copiedBytes = copiedBytes + buffer.value.length;
        const percent = ((copiedBytes/totalSize)*100).toFixed(2);
        inProgressBackups[folderName].carExportPercent = percent;
      } catch (error) {
        console.error(error);
      }
    }
  } while (!buffer.done);

  inProgressBackups[folderName].carExportReady = true;  
  console.log("The CAR file was exported. File name: ", fileName);
    
  return { payloadCID: rootCID, payloadSize: stat.cumulativeSize };
}

async function addBackCAR(ipfs, CID, folderName, globSource) {
  console.log("Adding back CAR file to IPFS...");
  console.log("Probably this function shouldn't be used (obsolate) addBackCAR()");
  const fileName = folderName + ".car";
  const path = "./outputCARfiles/" + fileName;
  const ipfsAddResult = await ipfs.addAll(globSource(path, "**/*"));
  const carStats = await ipfsAddResult.next();
  console.log("The CAR file was added to IPFS.");
  
  const v0 = CID.asCID(carStats.value.cid)
  console.log("carCID: ", v0);
  console.log("carSize: ", carStats.value.size);

  //console.log("Probably this is PieceCID: ", v0.toV1());                    // !! NOT TRUE
  //console.log("Probably this is PieceSize: ", carStats.value.size);         // We used the one from the file system (ls -la), and it was different

  //return { pieceCID: v0.toV1(), pieceSize: carStats.value.size};
}


async function calculateCommP(folderName, payloadCID, CID) {
  let commPCid = null;
  let payloadSize = null;
  let paddedPieceSize = null;

  console.log("Calculating CommP...");
  const ps = spawn('./utils/helper.sh', [payloadCID], {encoding: 'utf-8'});

  ps.stdout.on('data', (data) => {
    console.log(`Most likely this will never happen stdout: ${data}`);
  });
  

  ps.stderr.on('data', (data) => {
    try {
      const CommPCIDRegEx = /CommPCid:[\ ]{0,99}[a-zA-Z0-9]{10,90}/g;
      const PayloadRegEx = /Payload:[\ ]{0,99}[0-9]{1,16} bytes/g;
      const PaddedPieceRegex = /Padded piece:[\ ]{0,99}[0-9]{1,16} bytes/g;
  
      const commPLine = data.toString().match(CommPCIDRegEx)[0];
      const payloadLine = data.toString().match(PayloadRegEx)[0];
      const paddedPieceLine = data.toString().match(PaddedPieceRegex)[0];
  
      const CommPCIDRegValueEx = /[a-zA-Z0-9]{10,90}/;
      const PayloadRegValueEx = /[0-9]{1,16}/;
      const PaddedPieceValueRegex = /[0-9]{1,16}/;
  
      commPCid = commPLine.match(CommPCIDRegValueEx)[0]
      payloadSize = payloadLine.match(PayloadRegValueEx)[0];
      paddedPieceSize = paddedPieceLine.match(PaddedPieceValueRegex)[0];
      
      inProgressBackups[folderName].commPCalculationReady = true;
      inProgressBackups[folderName].commP = commPCid;
      inProgressBackups[folderName].payloadSize = payloadSize;
      inProgressBackups[folderName].pieceSize = paddedPieceSize;

      console.log("CommP: ", commPCid)
      console.log("Payload size: ", payloadSize);
      console.log("Piece Size: ", paddedPieceSize);
      addToFilecoin(CID, folderName);
    } catch (error) {
      console.error("There was an error while trying to calculate commP!", error);
      inProgressBackups[folderName].commPCalculationError = error;
    }
  });
  
  ps.on('close', (code) => {
    if (code !== 0) {
      inProgressBackups[folderName].commPCalculationError = code;
      console.error("stream-commp returned a non-zero exit value!");
    }
    return;
  });


  return {commPCid, paddedPieceSize}
}

async function addToFilecoin(not_used, folderName) {
  // Convert piece CID string to hex bytes
  const cid = inProgressBackups[folderName].commP;
  const cidHexRaw = new CID(cid).toString('base16').substring(1);
  const cidHex = "0x" + cidHexRaw;
  const contractAddr = process.env.DEAL_CONTRACT;

  const verified = false;
  const skipIpniAnnounce = false;
  const removeUnsealedCopy = false;

  const extraParamsV1 = [
    "http://45.91.171.156:3000/fetch?fileName=" + folderName + ".car",
    inProgressBackups[folderName].payloadSize,
    skipIpniAnnounce,
    removeUnsealedCopy,
  ]

  const startEpoch = 215000;

  const DealRequestStruct = [
    cidHex,
    inProgressBackups[folderName].pieceSize,
    verified,
    inProgressBackups[folderName].payloadCID,
    startEpoch,               // arbitrary number, will need to fetch this later
    (startEpoch+600000),      // end
    0,                        // storage price per epoch
    0,                        // provider collateral
    0,                        // client collateral
    1,                        // extra params version
    extraParamsV1,
  ];
  
  const networkId = network.defaultNetwork;
  console.log("Making deal proposal on network", networkId)

  const wallet = new ethers.Wallet(network.networks[networkId].accounts[0], ethers.provider);       // Create a new wallet instance
  const DealClient = await ethers.getContractFactory("DealClient", wallet);                         // Contract Factory
  const dealClient = await DealClient.attach(contractAddr);                                         // Contract instance
  
  transaction = await dealClient.startBackup(DealRequestStruct)                                // Transaction
  transactionReceipt = await transaction.wait()

  const event = transactionReceipt.events[0].topics[1];                                             // Listen for DealProposalCreate event
  //console.log("transactionReceipt: ", transactionReceipt);
  //console.log("Events: ", transactionReceipt.events);
  //console.log("Topics: ", transactionReceipt.events[0].topics);
  inProgressBackups[folderName].dealRequestMade = true;
  console.log("Complete! Event Emitted. ProposalId is:", event);

  checkDealStatus(folderName);
}

async function checkDealStatus(folderName) {
  try {
    const networkId = network.defaultNetwork;
    const contractAddr = process.env.DEAL_CONTRACT;
    const commPasBytes = new CID(inProgressBackups[folderName].commP).bytes;
    console.log("Waiting for DealID on network", networkId);
    const wallet = new ethers.Wallet(network.networks[networkId].accounts[0], ethers.provider);       // Create a new wallet instance
    const DealClient = await ethers.getContractFactory("DealClient", wallet);                         // Contract Factory
    const dealClient = await DealClient.attach(contractAddr);                                         // Contract instance
    const max_try = 50;
    let try_count = 0;
    let dealID = 0;
  
    do { 
      console.log("Attempt ", try_count);
      const result = await dealClient.getDealId(commPasBytes);                                        // Send transaction
      dealID = result.toNumber();
      console.log("Deal ID: ", dealID);
      if (dealID !== 0) {
        inProgressBackups[folderName].dealPublished = true;
        break;
      }
      try_count++;
      await delay(1000*60*2);
    } while (try_count < max_try && dealID === 0);
  
    if (try_count === max_try && dealID === 0) {
      inProgressBackups[folderName].dealIdError = `Tried to get the DealID ${try_count} times without success. Most likely there was an error with making the deal.`;
      console.error(`Tried to get the DealID ${try_count} times without success. Most likely there was an error with making the deal.`);
      return;
    }

    console.log(`Backup finished successfully.`);
    /*const refreshTransaction = dealClient.refreshValues(dealID);
    console.log("Refresh transaction made. Hash: ", refreshTransaction.hash);

    const isDealActivated = await dealClient.getDealVerificationStatus(dealID);
    console.log("Is Deal Activated? ", isDealActivated);
    const dealActive = await dealClient.getDealActivationStatus(dealID);
    console.log("Deal Active: ", dealActive);*/
  } catch (error) {
    inProgressBackups[folderName].dealIdError = error;
    console.error("There was an error while trying to get DealID", error);
  }
}

function listActiveBackups(name) {
  if (name) {
    if (inProgressBackups.hasOwnProperty(name)) {
      return inProgressBackups[name]; 
    } else {
      return { error: "There is no InProgress backup with that name."};
    }
  } else {
    return inProgressBackups;
  }
}

function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time));
} 

module.exports = { startBackup, fillArrayWithPinnedCIDs, copyToMFS, createCAR, addBackCAR, calculateCommP, addToFilecoin, listActiveBackups }