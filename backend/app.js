const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.send("Hello there! This is the backend of the IPFS-Backup application.");
});

app.listen(port, () => {
  console.log(`IPFS-Backup API server listening on port ${port}`);
});