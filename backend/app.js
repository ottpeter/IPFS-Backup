const express = require('express');
require('dotenv').config();
const backupRoutes = require('./routes/backup');
const fetchRoutes = require('./routes/fetch');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.send("Hello there! This is the backend of the IPFS-Backup application.");
});

/** Routes */
app.use('/backup', backupRoutes);
app.use('/fetch', fetchRoutes);

app.listen(port, () => {
  console.log(`IPFS-Backup API server listening on port ${port}`);
});