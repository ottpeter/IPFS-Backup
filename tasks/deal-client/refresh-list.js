const CID = require('cids');

task(
  "refresh-list",
  "Refresh list of backup items, based on commP list"
)
  .addParam("contract", "The address of the deal client solidity")
  .addParam("commPList", "List of backups to be refreshed")
  .setAction(async (taskArgs) => {
      const contractAddr = taskArgs.contract;
      const stringList = taskArgs.commP;
      const commPasBytesList = stringList.map((commP) => new CID(commP).bytes);
      const networkId = network.name;
      console.log("Refreshing list of backup items on network ", networkId)

      const wallet = new ethers.Wallet(network.config.accounts[0], ethers.provider);        // Create a new wallet instance
      const DealClient = await ethers.getContractFactory("DealClient", wallet);             // Create a DealClient contract factory
      const dealClient = await DealClient.attach(contractAddr);                             // Create a contract instance
        
      let result = await dealClient.refreshMetadataForList(commPasBytesList);         // Send transaction
      if (result) console.log(`The backup items for the given list were refreshed.`);
  })