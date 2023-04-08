const CID = require('cids')

task(
    "start-backup",
    "Start the backup proccess, it will create a BackupItem in the contract, and later the contract can keep target redundancy based on that. It will try to make initial deals."
  )
    .addParam("contract", "The address of the deal client solidity")
    .addParam("name", "Name of the backup (this serves as a timestamp as well)")
    .addParam("pieceCid", "PiceCID, alias commP")
    .addParam("pieceSize", "Size of PieceCID")
    .addParam("label", "The deal label (typically the raw cid)")
    .addParam("dealDuration", "Deal duration in epoch")
    .addParam("maxPricePerEpoch", "The max cost of the deal, in FIL, per epoch")
    .addParam("originalLocation", "Location ref, the original location of the data, later probably it will mirror it from existing provider")
    .addParam("carSize", "The size of the .car file")
    .setAction(async (taskArgs) => {
        //store taskargs as useable variables
        //convert piece CID string to hex bytes
        const cid = taskArgs.pieceCid
        const cidHexRaw = new CID(cid).toString('base16').substring(1)
        const cidHex = "0x" + cidHexRaw
        const contractAddr = taskArgs.contract

        const BackupRequestStruct = {
            pieceCID: cidHex,
            pieceSize: taskArgs.pieceSize,
            label: taskArgs.label,
            dealDuration: taskArgs.dealDuration,
            maxPricePerEpoch: taskArgs.maxPricePerEpoch,
            originalLocation: taskArgs.originalLocation,
            carSize: taskArgs.carSize,
        }

        const networkId = network.name
        console.log("Making deal proposal on network", networkId)

        //create a new wallet instance
        const wallet = new ethers.Wallet(network.config.accounts[0], ethers.provider)
        
        //create a DealClient contract factory
        const DealClient = await ethers.getContractFactory("DealClient", wallet)
        //create a DealClient contract instance 
        //this is what you will call to interact with the deployed contract
        const dealClient = await DealClient.attach(contractAddr)
        
        //send a transaction to call makeDealProposal() method
        transaction = await dealClient.startBackup(BackupRequestStruct)
        transactionReceipt = await transaction.wait()

        //listen for DealProposalCreate event
        const event = transactionReceipt.events[0].topics[0]
        console.log("transactionReceipt: ", transactionReceipt);
        console.log("Events: ", transactionReceipt.events);
        console.log("Topics: ", transactionReceipt.events[0].topics);
        console.log("Complete! Event Emitted. ProposalId is:", event)
    })