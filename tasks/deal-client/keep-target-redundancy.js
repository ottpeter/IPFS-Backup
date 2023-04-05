const CID = require('cids');

task(
  "keep-target-redundancy",
  "Bring up a backup item to target redundancy. Refresh metadata needs to be called first, for the contract to be aware of the current state of the deals."
)
  .addParam("contract", "The address of the deal client solidity")
  .addParam("commP", "The PieceCID")
  .setAction(async (taskArgs) => {
      const contractAddr = taskArgs.contract;
      const commP = taskArgs.commP;
      const commPasBytes = new CID(commP).bytes;
      const networkId = network.name;
      console.log("Bringing up backup item to target redundancy on network ", networkId)

      const wallet = new ethers.Wallet(network.config.accounts[0], ethers.provider);        // Create a new wallet instance
      const DealClient = await ethers.getContractFactory("DealClient", wallet);             // Create a DealClient contract factory
      const dealClient = await DealClient.attach(contractAddr);                             // Create a contract instance
        
      let result = await dealClient.keepTargetRedundancy(commPasBytes);                     // Send transaction
      console.log("result (bool): ", result);
      console.log(`The backup item with CoomP ${commP} was refreshed.`);
  })