const network = {
  solidity: "0.8.17",
  defaultNetwork: "hyperspace",
  networks: {
      hyperspace: {
          chainId: 3141,
          url: "https://api.hyperspace.node.glif.io/rpc/v1",
      },
  },
  paths: {
      sources: "./contracts",
      tests: "./test",
      cache: "./cache",
      artifacts: "./artifacts",
  },
  contract: "0x93949e17bEEa4D52330f9F1F47A61C4143A72f93",
  server: "5.180.183.88"
}

module.exports = { network };