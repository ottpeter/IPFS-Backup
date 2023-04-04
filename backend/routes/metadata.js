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
  const result = await getBackupItem(commP);
  if (result.error === 0) {
    res.json({
      backupItem: result.backupItem
    });
  } else {
    res.json({
      error: result.error
    });
  }
});

// Get Deals for BackupItem, based on commP (only Deals)
router.get('/get-only-deals', async (req, res) => {
  const commP = req.query.commp;
  const result = await getDeals(commP);
  if (error === 0) {
    res.json({
      deals: result.deals
    })
  } else {
    res.json({
      error: result.error
    });
  }
});

// Get the whole BackupItem based on commP (BackupItem + associated Deals array)
router.get('/get-backup-item', async (req, res) => {
  const commP = req.query.commp;
  const backupItemResult = await getBackupItem(commP);
  const dealsResult = await getDeals(commP);
  if (backupItemResult.error === 0 && dealsResult.error === 0) {
    res.json({
      backupItem: backupItemResult.backupItem,
      deals: dealsResult.deals
    });
  } else {
    res.json({
      backupItem: backupItemResult.backupItem,
      deals: dealsResult.deals,
      error: backupItemResult.error + dealsResult.error,
      backupItemError: backupItemResult.error,
      dealsError: dealsResult.error
    });
  }
});


module.exports = router;