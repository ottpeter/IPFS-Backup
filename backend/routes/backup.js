const express = require('express');
const router = express.Router();
const { fillArrayWithPinnedCIDs, copyToMFS, createCAR, addBackCAR, calculateCommP, listActiveBackups, startBackup } = require('../utils/backupUtils');

// This will start the backup process. Probably we will change it to POST instead of GET, and it would be good if we could give in some parameters, like PeerID
router.get('/start', async (req, res) => {
  const folderName = "backup" + Date.now();
  const { ipfs, CID, globSource, _ } = await startBackup(folderName, res);
  const arrayOfCIDs = await fillArrayWithPinnedCIDs(ipfs, folderName);
  await copyToMFS(ipfs, arrayOfCIDs, folderName);
  const { payloadCID, payloadSize } = await createCAR(ipfs, CID, folderName, globSource);
  await calculateCommP(folderName, payloadCID);
  //await addBackCAR(ipfs, CID, folderName, globSource)
  
});

// This will backup a single folder, that it is pointed to
router.get('/folder', async (req, res) => {
  const { ipfs, CID, globSource, folderName } = await startBackup(req.query.name, res);
  const { payloadCID, payloadSize }  = await createCAR(ipfs, CID, folderName);
  const {commPCid, paddedPieceSize} = await calculateCommP(folderName, payloadCID);
  console.log("The resulting commPCID: ", commPCid);
  console.log("The resulting Piece Size: ", paddedPieceSize);
  //await addBackCAR(ipfs, CID, folderName, globSource);
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

router.get('/run-commp', async (req, res) => {
  res.json({message: "Calculate commP started!"});
  calculateCommP();
})

router.get('/show-inprogress', async (req, res) => {
  res.json(listActiveBackups(req.query.name));
});

module.exports = router;