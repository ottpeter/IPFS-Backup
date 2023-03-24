const express = require('express');
//const { create } = require('ipfs-http-client')
const router = express.Router();
//const path = require("path");
//const ipfsAPI = require('ipfs-http-client');

// This will start the backup process. Probably we will change it to POST instead of GET, and it would be good if we could give in some parameters, like PeerID
router.get('/start', async (req, res) => {
  console.log("IPFS-Backup started...");
  const { create } = await import('kubo-rpc-client');
  const ipfs = create();          // Default, http://localhost:5001
  const folderName = "backup" + Date.now()

  const arrayOfCIDs = await fillArrayWithPinnedCIDs(ipfs);
  await copyToMFS(ipfs, arrayOfCIDs, folderName);
  await createCAR(ipfs, folderName);
  
  
  
  
  
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
  ipfs.files.mkdir("/" + folderName);

  for (let i = 0; i < arrayOfCIDs.length; i++) {
    ipfs.files.cp("/ipfs/" + arrayOfCIDs[i].toString(), "/" + folderName + "/" + arrayOfCIDs[i].toString())
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

  console.log("exportResult: ", await exportResult.next())
}

async function calculateCommP(ipfs) {

}

async function addToFilecoin(ipfs) {

}


module.exports = router;