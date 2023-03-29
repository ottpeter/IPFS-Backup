const fs = require('fs');
const { exec, spawn, spawnSync } = require('child_process');
const Readable = require('stream').Readable;

const backupObj = {
  name: "backup123",
  carExportReady: false,
  commPCalculationReady: false,
  dealRequestMade: false,
  dealAccepted: false,
  dealActive: false
};

const inProgressBackups = {};             // Object that contains backupObj's

// Start backup (create InProgress object)
async function startBackup(req, res) {
  console.log("IPFS-Backup started...");  
  const folderName = req.query.name;
  console.log("Folder: ", folderName);
  res.json({message: "IPFS-Backup started", folder: folderName});
  const { create, CID, globSource } = await import('kubo-rpc-client');
  const ipfs = create();          // Default, http://localhost:5001

  return { ipfs, CID, globSource};
}

// This will give back an array of CIDs, that are individual files or folders (not fragments of files)
async function fillArrayWithPinnedCIDs(ipfs) {
  console.log("Getting list of pinned content...")
  const pinList = await ipfs.pin.ls({type: "recursive"});
  let nextItem = null;
  let resultArray = [];

  do {
    nextItem = await pinList.next();
    if (!nextItem.done) resultArray.push(nextItem.value.cid)
  } while (!nextItem.done);

  return resultArray;
}

async function copyToMFS(ipfs, arrayOfCIDs, folderName) {
  console.log("Copying pinned content to MFS...");
  //console.log("arrayOfCIDs: ", arrayOfCIDs);
  await ipfs.files.mkdir("/" + folderName);

  for (let i = 0; i < arrayOfCIDs.length; i++) {
    await ipfs.files.cp("/ipfs/" + arrayOfCIDs[i].toString(), "/" + folderName + "/" + arrayOfCIDs[i].toString())
  }

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
  console.log("It is possible that this is the PayloadCID: ", rootCID);
  console.log("Possibly this is PayloadSize: ", stat.cumulativeSize);

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
    console.log()

    if (!buffer.done) {
      try {
        fs.appendFileSync("./outputCARfiles/" + fileName, buffer.value);
        copiedBytes = copiedBytes + buffer.value.length;
        const percent = ((copiedBytes/totalSize)*100).toFixed(2);
        console.log(`Percent: ${percent} %`);
      } catch (error) {
        console.error(error);
      }
    }
  } while (!buffer.done);

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

  const ps = spawn('./utils/helper.sh', [payloadCID]);

  ps.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
  });
  
  ps.stderr.on('data', (data) => {
    //console.error(`The big text: ${data}`);
    const CommPCIDRegEx = /CommPCid: [a-zA-Z0-9]{10,90}/;
    const PayloadRegEx = /Payload:               [0-9]{0,16} bytes/;
    const PaddedPieceRegex = /Padded piece:         [0-9]{0,16} bytes/;

    const commPLine = data.toString().match(CommPCIDRegEx)[0];
    const payloadLine = data.toString().match(PayloadRegEx)[0];
    const paddedPieceLine = data.toString().match(PaddedPieceRegex)[0];
    
    console.log("CommP Line: ", commPLine);
    console.log("Payload Line: ", payloadLine);
    console.log("Padded Piece Line: ", paddedPieceLine);

    const CommPCIDRegValueEx = /[a-zA-Z0-9]{10,90}/;
    const PayloadRegValueEx = /[0-9]{1,16}/;
    const PaddedPieceValueRegex = /[0-9]{1,16}/;

    commPCid = commPLine.match(CommPCIDRegValueEx)[0]
    console.log("commP: ", commPCid)
    payloadSize = payloadLine.match(PayloadRegValueEx)[0];
    console.log("Payload size: ", payloadSize);
    paddedPieceSize = paddedPieceLine.match(PaddedPieceValueRegex)[0];
    console.log("Piece Size: ", paddedPieceSize);
    inProgressBackups[folderName]
  });
  
  ps.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
    if (code !== 0) console.error("Panic!");
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

function listActiveBackups() {
  return inProgressBackups;
}

module.exports = { startBackup, fillArrayWithPinnedCIDs, copyToMFS, createCAR, addBackCAR, calculateCommP, addToFilecoin, listActiveBackups }