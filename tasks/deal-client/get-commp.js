const CID = require('cids');

task(
    "get-commp",
    "Get CommP from UniqID"
  )
    .addParam("contract", "The address of the deal client solidity")
    .addParam("uniqId", "The PieceCID, alias commP")
    .setAction(async (taskArgs) => {
        const contractAddr = taskArgs.contract;
        console.log("Getting deal proposal on network", networkId);

        const wallet = new ethers.Wallet(network.config.accounts[0], ethers.provider);
        const DealClient = await ethers.getContractFactory("DealClient", wallet);
        const dealClient = await DealClient.attach(contractAddr);
          
        //send a transaction to call makeDealProposal() method
        //transaction = await dealClient.getDealProposal(proposalID)
        let result = await dealClient.getCommpFromId(taskArgs.uniqId);
        console.log("CommP:", result);
    })