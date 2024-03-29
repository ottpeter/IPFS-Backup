const fs = require('fs');
const { spawn } = require('child_process');
const { ethers } = require('hardhat');
const { network } = require("../network");
const CID = require('cids');

const BASE_FOLDER = "IPFS_BACKUPS";

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
async function startBackup(backupName, folderName, res) {
  console.log("IPFS-Backup started...");  
  console.log("Folder: ", folderName);
  inProgressBackups[backupName] = Object.assign({}, backupObj);
  inProgressBackups[backupName].name = backupName;
  res.json({message: "IPFS-Backup started", folder: folderName, backupName: backupName});
  const { create, CID, globSource } = await import('kubo-rpc-client');
  const ipfs = create();          // Default, http://localhost:5001

  return { ipfs, CID, globSource};
}

// This will give back an array of CIDs, that are individual files or folders (not fragments of files)
async function fillArrayWithPinnedCIDs(ipfs, backupName) {
  console.log("Getting list of pinned content...")
  const pinList = await ipfs.pin.ls({type: "recursive"});
  let nextItem = null;
  let resultArray = [];

  do {
    nextItem = await pinList.next();
    if (!nextItem.done) resultArray.push(nextItem.value.cid)
  } while (!nextItem.done);

  inProgressBackups[backupName].fillArrayReady = true;
  return resultArray;
}

async function copyToMFS(ipfs, arrayOfCIDs, folderName) {
  try {
    console.log("Copying pinned content to MFS...");
    //console.log("arrayOfCIDs: ", arrayOfCIDs);
    await ipfs.files.mkdir("/" + BASE_FOLDER + "/" + folderName, { parents: true });

    for (let i = 0; i < arrayOfCIDs.length; i++) {
      await ipfs.files.cp("/ipfs/" + arrayOfCIDs[i].toString(), "/" + BASE_FOLDER +  "/" + folderName + "/" + arrayOfCIDs[i].toString());
    }
  
    inProgressBackups[folderName].copyToMFSReady = true;
    console.log("All content copied to MFS.");
  } catch (error) {
    console.error("There was an error while trying to copy files into MFS: ", error);
  }
}

async function createCAR(ipfs, backupName, folderName) {
  console.log("Statistics about the newly created backup folder: ");
  let path = "";
  if (backupName === folderName) path = "/" + BASE_FOLDER + "/" + folderName;           // If this is a full backup, include base folder in path
  else path = "/" + folderName

  const stat = await ipfs.files.stat(path);
  console.log(stat);
  const v0RootCID = await stat.cid;
  const rootCID = v0RootCID.toV1()
  const totalSize = stat.cumulativeSize;
  let copiedBytes = 0;
  inProgressBackups[backupName].payloadCID = rootCID.toString();
  inProgressBackups[backupName].cumulativeSize = stat.cumulativeSize;

  const exportResult = await ipfs.dag.export(rootCID);
  let buffer = {value: undefined, done: false};
  const fileName = backupName + ".car";
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
        inProgressBackups[backupName].carExportPercent = percent;
      } catch (error) {
        console.error(error);
      }
    }
  } while (!buffer.done);

  inProgressBackups[backupName].carExportReady = true;  
  console.log("The CAR file was exported. File name: ", fileName);
    
  return { payloadCID: rootCID, payloadSize: stat.cumulativeSize };
}



async function calculateCommP(folderName, backupName, payloadCID) {
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
      
      inProgressBackups[backupName].commPCalculationReady = true;
      inProgressBackups[backupName].commP = commPCid;
      inProgressBackups[backupName].payloadSize = payloadSize;
      inProgressBackups[backupName].pieceSize = paddedPieceSize;

      console.log("CommP: ", commPCid)
      console.log("Payload size: ", payloadSize);
      console.log("Piece Size: ", paddedPieceSize);
      addToFilecoin(backupName, folderName);
    } catch (error) {
      console.error("There was an error while trying to calculate commP!", error);
      inProgressBackups[backupName].commPCalculationError = error;
    }
  });
  
  ps.on('close', (code) => {
    if (code !== 0) {
      inProgressBackups[backupName].commPCalculationError = code;
      console.error("stream-commp returned a non-zero exit value!");
    }
    return;
  });


  return {commPCid, paddedPieceSize}
}

async function addToFilecoin(backupName, folderName) {
  // Convert piece CID string to hex bytes
  const cid = inProgressBackups[backupName].commP;
  const cidHexRaw = new CID(cid).toString('base16').substring(1);
  const cidHex = "0x" + cidHexRaw;
  const contractAddr = process.env.DEAL_CONTRACT;
  
  const httpServerName = process.env.SERVER.replace('https://', 'http://') 

  const BackupRequestStruct = {
    name: backupName,
    pieceCID: cidHex,
    pieceSize: inProgressBackups[backupName].pieceSize,
    label: inProgressBackups[backupName].payloadCID,
    dealDuration: 600000,
    maxPricePerEpoch: 0,                                                      // Max price per epoch
    originalLocation: `${httpServerName}:${process.env.HTTP_PORT}/fetch?fileName=${backupName}.car`,
    carSize: inProgressBackups[backupName].payloadSize,
  }

  const networkId = network.defaultNetwork;
  console.log("Making deal proposal on network", networkId)

  const wallet = new ethers.Wallet(network.networks[networkId].accounts[0], ethers.provider);       // Create a new wallet instance
  const DealClient = await ethers.getContractFactory("DealClient", wallet);                         // Contract Factory
  const dealClient = await DealClient.attach(contractAddr);                                         // Contract instance
  
  transaction = await dealClient.startBackup(BackupRequestStruct);                                  // Transaction
  transactionReceipt = await transaction.wait();

  const event = transactionReceipt.events[0].topics[0];                                             // Listen for DealProposalCreate event

  inProgressBackups[backupName].dealRequestMade = true;
  console.log("Complete! Event Emitted. ProposalId is:", event);

  checkDealStatus(backupName);
}

async function checkDealStatus(backupName) {
  try {
    const networkId = network.defaultNetwork;
    const contractAddr = process.env.DEAL_CONTRACT;
    const commPasBytes = new CID(inProgressBackups[backupName].commP).bytes;
    console.log("Waiting for DealID on network", networkId);
    const wallet = new ethers.Wallet(network.networks[networkId].accounts[0], ethers.provider);       // Create a new wallet instance
    const DealClient = await ethers.getContractFactory("DealClient", wallet);                         // Contract Factory
    const dealClient = await DealClient.attach(contractAddr);                                         // Contract instance
    const max_try = 50;
    let try_count = 0;
    let deals = [];
  
    do { 
      console.log("Attempt ", try_count);
      deals = await dealClient.getDeals(commPasBytes);                                        // Send transaction
      //dealID = result.toNumber();
      console.log("Deals array: ", deals);
      if (deals.length > 0) {
        inProgressBackups[backupName].dealPublished = true;
        break;
      }
      try_count++;
      await delay(1000*60*2);
    } while (try_count < max_try && deals.length === 0);
  
    if (try_count === max_try && deals.length === 0) {
      inProgressBackups[backupName].dealIdError = `Tried to get the DealID ${try_count} times without success. Most likely there was an error with making the deal.`;
      console.error(`Tried to get the DealID ${try_count} times without success. Most likely there was an error with making the deal.`);
      return;
    }

    console.log(`Backup finished successfully.`);
    console.log("Deals: ", deals.map((deal) => ({
      dealId: deal.dealId.toNumber(),
      providerAddress: deal.providerAddress,
      startEpoch: deal.startEpoch.toNumber(),
      endEpoch: deal.endEpoch.toNumber(),
      status: {
        activated: deal.status.activated.toNumber(),
        terminated: deal.status.terminated.toNumber()
      },
      isActivated: deal.isActivated
    })));
    setTimeout(() => {
      delete inProgressBackups[backupName];
    }, 1000 * 60 * 15)

  } catch (error) {
    inProgressBackups[backupName].dealIdError = error;
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

function clearInProgressBackups() {
  //inProgressBackups = Object.assign({}, {});
  for (let key in inProgressBackups) {
    delete inProgressBackups[key];
  }
}

// Delete all files in the backup folder
async function clearBackupFolder(ipfs) {
  try {
    const response = await ipfs.files.rm("/" + BASE_FOLDER, { recursive: true });
    return true;
  } catch (error) {
    console.error("There was an error deleteing the backup folder: ", error);
    return false;
  }
}

function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time));
} 


module.exports = { 
  startBackup, 
  fillArrayWithPinnedCIDs, 
  copyToMFS, 
  createCAR, 
  calculateCommP, 
  addToFilecoin, 
  listActiveBackups, 
  clearInProgressBackups,
  clearBackupFolder
}