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
  contract: "0x40C17fc77940b3Ca321dfB835bd61261249C9BD9"
}

module.exports = { network };