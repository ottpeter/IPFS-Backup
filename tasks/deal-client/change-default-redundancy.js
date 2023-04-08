const CID = require('cids');

task(
  "change-default-redundancy",
  "Change the default target redundancy"
)
  .addParam("contract", "The address of the deal client solidity")
  .addParam("targetRedundancy", "The new target redundancy")
  .setAction(async (taskArgs) => {
      const contractAddr = taskArgs.contract;
      const networkId = network.name;
      console.log("Changing default target redundancy on network ", networkId)

      const wallet = new ethers.Wallet(network.config.accounts[0], ethers.provider);        // Create a new wallet instance
      const DealClient = await ethers.getContractFactory("DealClient", wallet);             // Create a DealClient contract factory
      const dealClient = await DealClient.attach(contractAddr);                             // Create a contract instance
        
      let result = await dealClient.changeDefaultTargetRedundancy(taskArgs.targetRedundancy);
      if (result) console.log(`The default target redundancy was changed. New value: ${taskArgs.targetRedundancy}`);
  })