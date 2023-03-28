const fs = require('fs');
const Readable = require('stream').Readable;

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

  //Readable.from(exportResult).pipe(fs.createWriteStream('example.car'));        // With this, we couldn't show progress that much
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
  const fileName = folderName + ".car";
  const path = "./outputCARfiles/" + fileName;
  const ipfsAddResult = await ipfs.addAll(globSource(path, "**/*"));
  const carStats = await ipfsAddResult.next();
  console.log("The CAR file was added to IPFS.");
  
  const v0 = CID.asCID(carStats.value.cid)
  console.log("carCID: ", v0);
  console.log("carSize: ", carStats.value.size);

  console.log("Probably this is PieceCID: ", v0.toV1());
  console.log("Probably this is PieceSize: ", carStats.value.size);         // We used the one from the file system (ls -la), and it was different

  return { pieceCID: v0.toV1(), pieceSize: carStats.value.size};
}


async function calculateCommP(ipfs) {

}

async function addToFilecoin(ipfs) {

}

module.exports = { fillArrayWithPinnedCIDs, copyToMFS, createCAR, addBackCAR, calculateCommP, addToFilecoin }