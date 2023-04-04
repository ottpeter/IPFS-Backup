const CID = require('cids');


task(
    "get-deals",
    "Gets the list of deals from commP"
  )
    .addParam("contract", "The address of the deal client solidity")
    .addParam("commP", "The PieceCID, alias commP")
    .setAction(async (taskArgs) => {
        const contractAddr = taskArgs.contract;
        const commP = taskArgs.commP;
        const commPasBytes = new CID(commP).bytes;
        const networkId = network.name;
        console.log("Getting the list of deals on network", networkId);

        const wallet = new ethers.Wallet(network.config.accounts[0], ethers.provider);
        const DealClient = await ethers.getContractFactory("DealClient", wallet);
        const dealClient = await DealClient.attach(contractAddr);
          
        //send a transaction to call makeDealProposal() method
        //transaction = await dealClient.getDealProposal(proposalID)
        let result = await dealClient.getDeals(commPasBytes);
        console.log("List of deals:", result.map((deal) => ({
          dealId: deal.dealId.toNumber(),
          providerAddress: deal.providerAddress,
          startEpoch: deal.startEpoch.toNumber(),
          endEpoch: deal.endEpoch.toNumber(),
          status: {
            activated: deal.status.activated.toNumber(),
            terminated: deal.status.terminated.toNumber()
          },
          isActivated: deal.isActivated
        })));
    })