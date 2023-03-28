const express = require('express');
const router = express.Router();
const { fillArrayWithPinnedCIDs, copyToMFS, createCAR, addBackCAR } = require('../utils/backupUtils');

// This will start the backup process. Probably we will change it to POST instead of GET, and it would be good if we could give in some parameters, like PeerID
router.get('/start', async (req, res) => {
  console.log("IPFS-Backup started...");
  res.json({message: "IPFS-Backup started"});
  const { create, CID, globSource } = await import('kubo-rpc-client');
  const ipfs = create();          // Default, http://localhost:5001
  const folderName = "backup" + Date.now()

  const arrayOfCIDs = await fillArrayWithPinnedCIDs(ipfs);
  await copyToMFS(ipfs, arrayOfCIDs, folderName);
  await createCAR(ipfs, CID, folderName, globSource);
  await addBackCAR(ipfs, CID, folderName, globSource)
  
});

// This will backup a single folder, that it is pointed to
router.get('/folder', async (req, res) => {
  console.log("IPFS-Backup started...");
  console.log(req.params)
  const folderName = req.query.name;
  console.log("Folder: ", folderName);
  res.json({message: "IPFS-Backup started", folder: folderName});
  const { create, CID, globSource } = await import('kubo-rpc-client');
  const ipfs = create();          // Default, http://localhost:5001

  await createCAR(ipfs, CID, folderName);
  await addBackCAR(ipfs, CID, folderName, globSource);
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

module.exports = router;