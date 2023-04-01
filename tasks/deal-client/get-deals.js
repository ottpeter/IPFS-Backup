task(
    "get-deals",
    "Gets a deal proposal from the proposal id"
  )
    .addParam("contract", "The address of the deal client solidity")
    .addParam("commP", "The PieceCID, alias commP")
    .setAction(async (taskArgs) => {
        const contractAddr = taskArgs.contract
        const commP = taskArgs.commP
        const networkId = network.name
        console.log("Getting deal proposal on network", networkId)

        //create a new wallet instance
        const wallet = new ethers.Wallet(network.config.accounts[0], ethers.provider)
        
        //create a DealClient contract factory
        const DealClient = await ethers.getContractFactory("DealClient", wallet)
        //create a DealClient contract instance 
        //this is what you will call to interact with the deployed contract
        const dealClient = await DealClient.attach(contractAddr)
          
        //send a transaction to call makeDealProposal() method
        //transaction = await dealClient.getDealProposal(proposalID)
        let result = await dealClient.getDeals(commP)
        console.log("The deal proposal is:", result)
    })