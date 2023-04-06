const CID = require('cids');

task(
  "get-name",
  "Get the name of a bacup based on commP"
)
  .addParam("contract", "The address of the deal client solidity")
  .addParam("commP", "commp, alias PieceCID")
  .setAction(async (taskArgs) => {
      const contractAddr = taskArgs.contract;
      const networkId = network.name;
      const commP = taskArgs.commP;
      const commPasBytes = new CID(commP).bytes;
      console.log(`Getting backup name for ${commP} on network ${networkId}`)

      const wallet = new ethers.Wallet(network.config.accounts[0], ethers.provider);        // Create a new wallet instance
      const DealClient = await ethers.getContractFactory("DealClient", wallet);             // Create a DealClient contract factory
      const dealClient = await DealClient.attach(contractAddr);                             // Create a contract instance
        
      let result = await dealClient.getNameForCommp(commPasBytes);                          // Send transaction
      if (result) console.log(`Backup item name: ${result}`);
  })