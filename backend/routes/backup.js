const express = require('express');
const router = express.Router();
const fs = require('fs');
const Readable = require('stream').Readable;

// This will start the backup process. Probably we will change it to POST instead of GET, and it would be good if we could give in some parameters, like PeerID
router.get('/start', async (req, res) => {
  console.log("IPFS-Backup started...");
  res.json({message: "IPFS-Backup started"});
  const { create } = await import('kubo-rpc-client');
  const ipfs = create();          // Default, http://localhost:5001
  const folderName = "backup" + Date.now()

  const arrayOfCIDs = await fillArrayWithPinnedCIDs(ipfs);
  await copyToMFS(ipfs, arrayOfCIDs, folderName);
  await createCAR(ipfs, folderName);
  
  
});


// Delete backup folders
router.get('/delete', async (req, res) => {
  console.log("Deleting old backup folders from MFS...");
  const { create } = await import('kubo-rpc-client');
  const ipfs = create();          // Default, http://localhost:5001
  const lsResult = ipfs.files.ls('/');

  let nextItem = null;
  let resultArray = [];

  do {
    nextItem = await lsResult.next();
    if (!nextItem.done && nextItem.value.name.includes("backup")) resultArray.push(nextItem.value)
  } while (!nextItem.done);

  for (let i = 0; i < resultArray.length; i++) {
    ipfs.files.rm("/" + resultArray[i].name, { recursive: true });
  }
  console.log("Old backup folders deleted.");
  res.json({message: "Old backup folders deleted."});
});

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

async function createCAR(ipfs, folderName) {
  console.log("Statistics about the newly created backup folder: ");
  const stat = await ipfs.files.stat("/" + folderName);
  console.log(stat);
  const rootCID = await stat.cid;

  const dagForRoot = await ipfs.dag.get(rootCID);
  console.log(dagForRoot);

  const exportResult = await ipfs.dag.export(rootCID);
  let buffer = {value: undefined, done: false};
  const fileName = folderName + ".car";
  console.log("Exporting data to a CAR file...");

  Readable.from(exportResult).pipe(fs.createWriteStream('example.car'))
  
  /* OLD METHOD, it will give the same result more-or-less
  do {
    buffer = await exportResult.next();
    console.log(buffer)

    if (!buffer.done) {
      try {
        fs.appendFileSync("./outputCARfiles/" + fileName, buffer.value);
        console.log("Success!");
      } catch (error) {
        console.error(error);
      }
    }
  } while (!buffer.done);
  */

  console.log("The CAR file was exported. File name: ", fileName);
}


async function calculateCommP(ipfs) {

}

async function addToFilecoin(ipfs) {

}


module.exports = router;