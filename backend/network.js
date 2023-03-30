const PRIVATE_KEY = process.env.PRIVATE_KEY
const network = {
  solidity: "0.8.17",
  defaultNetwork: "hyperspace",
  networks: {
      hyperspace: {
          chainId: 3141,
          url: "https://api.hyperspace.node.glif.io/rpc/v1",
          accounts: [PRIVATE_KEY],
      },
  },
  paths: {
      sources: "./contracts",
      tests: "./test",
      cache: "./cache",
      artifacts: "./artifacts",
  },
}

module.exports = { network };