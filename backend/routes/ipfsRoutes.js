const express = require('express');
const path = require('path');
const router = express.Router();
const { getFileSystem, createIPFSinstance } = require("../utils/ipfsUtils");


router.get('/mfs-tree', async function(req, res) {
  let result = null;
  const {ipfs, CID, globSource } = await createIPFSinstance();
  const tree = await getFileSystem(ipfs, '/');

  console.log("Tree: ", tree)

  res.json({result: "OK", mfsTree: tree})
});

module.exports = router;