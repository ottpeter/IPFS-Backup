const { ethers } = require('hardhat');
const { network } = require("../network");
const CID = require('cids');


// This function will refresh metadata for a single BackupItem
async function refreshSingle(commP) {
  try {
    const networkId = network.defaultNetwork;
    const contractAddr = process.env.DEAL_CONTRACT;
    const commPasBytes = new CID(commP).bytes;
    console.log(`Refreshing metadata for ${commP} on network ${networkId}`);
  
    const wallet = new ethers.Wallet(network.networks[networkId].accounts[0], ethers.provider);       // Create a new wallet instance
    const DealClient = await ethers.getContractFactory("DealClient", wallet);                         // Contract Factory
    const dealClient = DealClient.attach(contractAddr);                                               // Contract instance
  
    const transaction = await dealClient.refreshMetadataForBackupItem(commPasBytes);                  // Smart contract transaction
  
    console.log("Transaction: ", transaction);
    console.log("Events: ", transactionReceipt.events);
    console.log("Topics: ", transactionReceipt.events[0].topics);

    return 0;
  } catch (error) {
    console.error(`There was an error while trying to refresh metadata with commP ${commP}`, error);
    return error;
  }
}

// This function will get BackupItem metadata for a single item referred to by commP (no deals)
async function getBackupItem(commP) {
  try {
    const networkId = network.defaultNetwork;
    const contractAddr = process.env.DEAL_CONTRACT;
    const commPasBytes = new CID(commP).bytes;
    console.log(`Getting BackupItem for ${commP} on network ${networkId}`);
  
    const wallet = new ethers.Wallet(network.networks[networkId].accounts[0], ethers.provider);       // Create a new wallet instance
    const DealClient = await ethers.getContractFactory("DealClient", wallet);                         // Contract Factory
    const dealClient = DealClient.attach(contractAddr);                                               // Contract instance
  
    const backupItem = dealClient.getBackupItem(commPasBytes);                                        // Smart contract call (view)
    // we could probably do some error handling here as well

    return { result: backupItem, error: 0 }
  } catch (error) {
    console.error(`There was an error while getting BackupItem with commP ${commP} `,error);
    return { result: null, error: error };
  }
}

// This function will get the deals for a single BackupItem, referred to by commP (only the deals)
async function getDeals(commP) {
  try {
    const networkId = network.defaultNetwork;
    const contractAddr = process.env.DEAL_CONTRACT;
    const commPasBytes = new CID(commP).bytes;
    console.log(`Getting Deals for ${commP} on network ${networkId}`);

    const wallet = new ethers.Wallet(network.networks[networkId].accounts[0], ethers.provider);       // Create a new wallet instance
    const DealClient = await ethers.getContractFactory("DealClient", wallet);                         // Contract Factory
    const dealClient = DealClient.attach(contractAddr);                                               // Contract instance

    const deals = dealClient.getDeals(commPasBytes);                                                  // Smart contract call (view)
    // we could probably do some error handling here as well

    return { result: deals, error: 0 }
  } catch (error) {
    console.error(`There was an error while trying to get the deals for BackupItem with commP ${commP}`, error);
    return { result: null, error: 0 }
  }
}


module.exports = {
  refreshSingle,
  getBackupItem,
  getDeals
}