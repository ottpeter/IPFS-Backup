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
  contract: "0x1141eC466E5ab8dd839CfEF7aeA2F3eE1FeCacD2",
  server: "5.180.183.88"
}

module.exports = { network };