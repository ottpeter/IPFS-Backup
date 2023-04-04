const express = require('express');
const router = express.Router();
const { refreshSingle, getBackupItem, getDeals } = require('../utils/metadataUtils');


// Refresh a single BackupItem, this will not make new deals, this will just write the current truth to the smart contract state
router.get('/refresh-single', async (req, res) => {
  const result = await refreshSingle(req.query.commp);
  if (result === 0) {
    res.json({
      message: `Updated metadata for ${req.query.commp}`
    });
  } else {
    res.json({
      message: `There was an error while trying to refresh metadata for commP ${req.query.commP}`,
      error: result
    })
  }
});

// Get BackupItem metadata, based on commP (only BackupItem)
router.get('/get-only-backup-item', async (req, res) => {
  const commP = req.query.commp;
  const {backupItem, error} = await getBackupItem(commP);
  if (error === 0) {
    res.json({
      backupItem: backupItem
    });
  } else {
    res.json({
      error: error
    });
  }
});

// Get Deals for BackupItem, based on commP (only Deals)
router.get('/get-only-dealy', async (req, res) => {
  const commP = req.query.commp;
  const {deals, error} = await getDeals(commP);
  if (error === 0) {
    res.json({
      deals: deals
    })
  } else {
    res.json({
      error: error
    });
  }
});

// Get the whole BackupItem based on commP (BackupItem + associated Deals array)
router.get('/get-backup-item', async (req, res) => {
  const commP = req.query.commp;
  const {backupItem, backupItemError} = await getBackupItem(commP);
  const {deals, dealsError} = await getDeals(commP);
  if (backupItemError === 0 && dealsError) {
    res.json({
      backupItem: backupItem,
      deals: deals
    });
  } else {
    res.json({
      backupItem: backupItem,
      deals: deals,
      error: backupItemError + dealsError,
      backupItemError: backupItemError,
      dealsError: dealsError
    });
  }
});


module.exports = router;