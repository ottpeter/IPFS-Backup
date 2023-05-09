const express = require('express');
const fs = require('fs');
const http = require('http');
const https = require('https');
require('dotenv').config();
const backupRoutes = require('./routes/backup');
const fetchRoutes = require('./routes/fetch');
const metadataRoutes = require('./routes/metadata');
const ipfsRoutes = require('./routes/ipfsRoutes');
const app = express();
const port = process.env.PORT;

let privateKey = fs.readFileSync( process.env.SSL_PRIVATE_KEY );
let certificate = fs.readFileSync( process.env.SSL_CERT );

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


https.createServer({
    key: privateKey,
    cert: certificate
}, app).listen(port);

/*app.listen(port, () => {
  console.log(`IPFS-Backup API server listening on port ${port}`);
});
*/