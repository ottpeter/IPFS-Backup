const CID = require('cids');

task(
  "refresh-all",
  "Refresh all backup item metadata. At some point, we will run out of gas (this is not handled at the moment)"
)
  .addParam("contract", "The address of the deal client solidity")
  .setAction(async (taskArgs) => {
      const contractAddr = taskArgs.contract;
      const networkId = network.name;
      console.log("Refreshing all backup metadata on network ", networkId)

      const wallet = new ethers.Wallet(network.config.accounts[0], ethers.provider);        // Create a new wallet instance
      const DealClient = await ethers.getContractFactory("DealClient", wallet);             // Create a DealClient contract factory
      const dealClient = await DealClient.attach(contractAddr);                             // Create a contract instance
        
      let result = await dealClient.refreshMetadataForAll();                                // Send transaction
      if (result) console.log(`All backup item metadata was refreshed.`);
  })