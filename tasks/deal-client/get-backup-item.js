const CID = require('cids');

task(
  "get-backup-item",
  "Get BackupItem, that does not include the DealArray (but includes the index of it)"
)
  .addParam("contract", "The address of the deal client solidity")
  .addParam("commP", "The PieceCID")
  .setAction(async (taskArgs) => {
      const contractAddr = taskArgs.contract;
      const commP = taskArgs.commP;
      const commPasBytes = new CID(commP).bytes;
      const networkId = network.name;
      console.log("Getting BackupItem on network", networkId)

      const wallet = new ethers.Wallet(network.config.accounts[0], ethers.provider);        // Create a new wallet instance
      const DealClient = await ethers.getContractFactory("DealClient", wallet);             // Create a DealClient contract factory
      const dealClient = await DealClient.attach(contractAddr);                             // Create a contract instance
        
      let result = await dealClient.getBackupItem(commPasBytes);                            // Send transaction
      console.log("The BackupItem is:", result);
  })