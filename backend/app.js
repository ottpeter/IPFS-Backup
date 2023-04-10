const express = require('express');
require('dotenv').config();
const backupRoutes = require('./routes/backup');
const fetchRoutes = require('./routes/fetch');
const metadataRoutes = require('./routes/metadata');
const ipfsRoutes = require('./routes/ipfsRoutes');
const app = express();
const port = 3001;

app.get('/', (req, res) => {
  res.send("Hello there! This is the backend of the IPFS-Backup application.");
});

// CORS settings
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

/** Routes */
app.use('/backup', backupRoutes);
app.use('/fetch', fetchRoutes);
app.use('/metadata', metadataRoutes);
app.use('/ipfs', ipfsRoutes);

app.listen(port, () => {
  console.log(`IPFS-Backup API server listening on port ${port}`);
});
