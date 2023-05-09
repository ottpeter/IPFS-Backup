const network = {
  solidity: "0.8.17",
  defaultNetwork: "mainnet",
  networks: {
      hyperspace: {
          chainId: 3141,
          url: "https://api.hyperspace.node.glif.io/rpc/v1",
      },
      mainnet: {
          chainId: 314,
          url: "https://api.node.glif.io/rpc/v0",
      }
  },
  paths: {
      sources: "./contracts",
      tests: "./test",
      cache: "./cache",
      artifacts: "./artifacts",
  },
  contract: "0xB33A8293E929bb1d7012F807Fd759a6ff3dE7852",
  server: "https://mainnet.ipfs-backup.com",
  httpsPort: 5678
}

module.exports = { network };