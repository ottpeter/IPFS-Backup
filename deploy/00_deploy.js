require("hardhat-deploy")
require("hardhat-deploy-ethers")

const { networkConfig } = require("../helper-hardhat-config")


const private_key = network.config.accounts[0]
const wallet = new ethers.Wallet(private_key, ethers.provider)

module.exports = async ({ deployments }) => {
    console.log("Wallet Ethereum Address:", wallet.address)
    const chainId = network.config.chainId
    const tokensToBeMinted = networkConfig[chainId]["tokensToBeMinted"]


    //deploy FilecoinMarketConsumer
    /*const FilecoinMarketConsumer = await ethers.getContractFactory('FilecoinMarketConsumer', wallet);
    console.log('Deploying FilecoinMarketConsumer...');
    const filecoinMarketConsumer = await FilecoinMarketConsumer.deploy();
    await filecoinMarketConsumer.deployed()
    console.log('FilecoinMarketConsumer deployed to:', filecoinMarketConsumer.address);*/
    
    //deploy DealClient
    const DealClient = await ethers.getContractFactory('DealClient', wallet);
    console.log('Deploying DealClient...');
    const dc = await DealClient.deploy();
    await dc.deployed()
    console.log('DealClient deployed to:', dc.address);
}