'use strict'
require('@nomiclabs/hardhat-waffle')
require('@nomiclabs/hardhat-ethers')
require('solidity-coverage')
require('hardhat-deploy')
require('hardhat-log-remover')
require('hardhat-gas-reporter')
require('dotenv').config()
require('./tasks/create-release')
require('./tasks/deploy-pool')
require('./tasks/strategy-configuration')
require('./tasks/deploy-upgrader')
require('./tasks/deploy-buyback')
require('./tasks/upgrade-pool')
require('./tasks/hardhat-hook')
const junk = 'test test test test test test test test test test test junk'

if (process.env.RUN_CONTRACT_SIZER === 'true') {
  require('hardhat-contract-sizer')
}

module.exports = {
  defaultNetwork: 'hardhat',
  networks: {
    localhost: {
      saveDeployments: true,
      timeout: 1000000,
      accounts: { mnemonic: process.env.MNEMONIC || junk },
    },
    hardhat: {
      initialBaseFeePerGas: 0,
      forking: {
        url: process.env.NODE_URL,
        blockNumber: process.env.BLOCK_NUMBER ? parseInt(process.env.BLOCK_NUMBER) : undefined,
      },
      saveDeployments: true,
    },
    mainnet: {
      url: process.env.NODE_URL,
      chainId: 1,
      gas: 6700000,
      accounts: { mnemonic: process.env.MNEMONIC || junk },
    },
    goerli: {
      url: process.env.NODE_URL,
      chainId: 5,
      gas: 12000000,
      accounts: { mnemonic: process.env.MNEMONIC || junk },
    },
    polygon: {
      url: process.env.NODE_URL,
      chainId: 137,
      gas: 11700000,
      accounts: { mnemonic: process.env.MNEMONIC || junk },
    },
    avalanche: {
      url: process.env.NODE_URL,
      chainId: 43114,
      gas: 8000000,
      accounts: { mnemonic: process.env.MNEMONIC || junk },
    },
  },
  paths: {
    deployments: 'deployments',
    sources: process.env.SOURCES_DIR || './contracts',
  },
  namedAccounts: {
    deployer: process.env.DEPLOYER || 0,
  },
  contractSizer: {
    alphaSort: true,
    runOnCompile: true,
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === 'true',
  },
  solidity: {
    version: '0.8.9',
    settings: {
      optimizer: {
        enabled: true,
        runs: 100,
      },
      outputSelection: {
        '*': {
          '*': ['storageLayout'],
        },
      },
    },
  },
  mocha: {
    timeout: 400000,
  },
}
