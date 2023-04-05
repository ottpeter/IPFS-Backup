const CID = require('cids');

task(
    "get-name-array",
    "Get array of {name, commP} from start value and how-many value"
  )
    .addParam("contract", "The address of the deal client solidity")
    .addParam("from", "Start index of nameLookupArray")
    .addParam("count", "How many elements we want")
    .setAction(async (taskArgs) => {
        const contractAddr = taskArgs.contract;
        const networkId = network.name;
        console.log("Getting nameLookupArray segment on network ", networkId);

        const wallet = new ethers.Wallet(network.config.accounts[0], ethers.provider);
        const DealClient = await ethers.getContractFactory("DealClient", wallet);
        const dealClient = await DealClient.attach(contractAddr);
          
        let result = await dealClient.getNameLookupArraySegment(taskArgs.from, taskArgs.count);
        console.log("nameLookupArray segment: ", result);
    })