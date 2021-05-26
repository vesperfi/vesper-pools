'use strict'
require('@nomiclabs/hardhat-waffle')
require('@nomiclabs/hardhat-ethers')
require('solidity-coverage')
require('hardhat-deploy')
require('hardhat-log-remover')
require('hardhat-gas-reporter')
require('dotenv').config()

const gasPrice = 55000000000

module.exports = {
  defaultNetwork: 'hardhat',
  networks: {
    localhost: {
      saveDeployments: true,
    },
    hardhat: {
      forking: {
        url: process.env.NODE_URL,
        blockNumber: process.env.BLOCK_NUMBER? parseInt(process.env.BLOCK_NUMBER) : undefined
      },
      saveDeployments: true,
    },
    mainnet: {
      url: process.env.NODE_URL,
      chainId: 1,
      gas: 6700000,
      gasPrice,
    },
  },
  paths: {
    deployments: 'deployments',
  },
  namedAccounts: {
    deployer: {
      default: 0, // here this will by default take the first account as deployer
      1: 'ledger://0xB5AbDABE50b5193d4dB92a16011792B22bA3Ef51', 
      4: '0xA296a3d5F026953e17F472B497eC29a5631FB51B', // but for rinkeby it will be a specific address
      goerli: '0x84b9514E013710b9dD0811c9Fe46b837a4A0d8E0',
    }
  },
  solidity: {
    version: '0.8.3',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      }
    }
  },
  mocha: {
    timeout: 200000,
  },
}
