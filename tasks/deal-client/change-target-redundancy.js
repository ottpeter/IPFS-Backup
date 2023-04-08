const CID = require('cids');

task(
  "change-target-redundancy",
  "Change target redundancy for a backup item."
)
  .addParam("contract", "The address of the deal client solidity")
  .addParam("commP", "CommP (PieceCID of the backup item")
  .addParam("targetRedundancy", "New target redundancy")
  .setAction(async (taskArgs) => {
      const contractAddr = taskArgs.contract;
      const commP = taskArgs.commP;
      const commPasBytes = new CID(commP).bytes;
      const networkId = network.name;
      console.log("Changing target redundancy on network  ", networkId)

      const wallet = new ethers.Wallet(network.config.accounts[0], ethers.provider);        // Create a new wallet instance
      const DealClient = await ethers.getContractFactory("DealClient", wallet);             // Create a DealClient contract factory
      const dealClient = await DealClient.attach(contractAddr);                             // Create a contract instance
        
      let result = await dealClient.changeTargetRedundancy(commPasBytes, taskArgs.targetRedundancy);
      if (result) console.log(`The target redundancy for backup item with commP ${taskArgs.commP} was changed to ${taskArgs.targetRedundancy}`);
  })