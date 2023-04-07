const express = require('express');
const cors = require('cors')
require('dotenv').config();
const backupRoutes = require('./routes/backup');
const fetchRoutes = require('./routes/fetch');
const metadataRoutes = require('./routes/metadata');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.send("Hello there! This is the backend of the IPFS-Backup application.");
});

app.use(cors());

/** Routes */
app.use('/backup', backupRoutes);
app.use('/fetch', fetchRoutes);
app.use('/metadata', metadataRoutes);

app.listen(port, () => {
  console.log(`IPFS-Backup API server listening on port ${port}`);
});