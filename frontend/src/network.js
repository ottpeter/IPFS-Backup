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
  contract: "0xABb431C6d4A6138BC5A2a6026C8Ad2648DC82982",
  server: "https://test1.ipfs-backup.com"
}

module.exports = { network };