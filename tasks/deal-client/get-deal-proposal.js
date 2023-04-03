const CID = require('cids');

task(
    "get-deal-proposal",
    "Get the Deal info the miner would fetch, from CommP. Will give back byte array."
  )
    .addParam("contract", "The address of the deal client solidity")
    .addParam("uniqId", "The PieceCID, alias commP")
    .setAction(async (taskArgs) => {
        const contractAddr = taskArgs.contract;
        const networkId = network.name;
        console.log("Getting bytes from UniqID on network", networkId);

        const wallet = new ethers.Wallet(network.config.accounts[0], ethers.provider);
        const DealClient = await ethers.getContractFactory("DealClient", wallet);
        const dealClient = await DealClient.attach(contractAddr);
          
        //send a transaction to call makeDealProposal() method
        //transaction = await dealClient.getDealProposal(proposalID)
        let result = await dealClient.getDealProposal(taskArgs.uniqId);
        console.log("Bytes:", result);
    })