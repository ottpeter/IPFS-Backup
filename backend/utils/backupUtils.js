const fs = require('fs');
const { exec, spawn, spawnSync } = require('child_process');
const Readable = require('stream').Readable;

const backupObj = {
  name: "",
  fillArrayReady: false,
  copyToMFSReady: false,
  carExportReady: false,
  commPCalculationReady: false,
  dealRequestMade: false,
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


async function calculateCommP(folderName, payloadCID) {
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

async function addToFilecoin(ipfs) {
  // 1) The original deal-maker contract (fevm-starter-kit) should be accessible from within this repository
  // 2) We should have an access key for it in a .env file
  // 3) We should call makeDealProposal
  // 4) Record the result somewhere (would need a database for that)
  // 5) Start rewriting the contract that way, that it is keeping track of IPFS PeerID with redundancy, and date of backup
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

module.exports = { startBackup, fillArrayWithPinnedCIDs, copyToMFS, createCAR, addBackCAR, calculateCommP, addToFilecoin, listActiveBackups }