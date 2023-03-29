const express = require('express');
const path = require('path');
require('dotenv').config()
const router = express.Router();


router.get('/', function(req, res) {
  let result = null;
  console.log(process.env)
  const options = {
    root: path.join(process.env.OUTPUT_ROOT)
  };

  const file = req.query.fileName;                                                // Name of the file
  res.sendFile(file, options, function (err) {                                    // Send the file to the StorageProvider
    if (err) {
      console.error("There was an error while trying to send the file: ", err);
    } else {
      console.log('Sent file: ', path);
    }
  });
  
});

module.exports = router;