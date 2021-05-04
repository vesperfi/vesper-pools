'use strict'
require('@nomiclabs/hardhat-waffle')
require('solidity-coverage')
require('dotenv').config()

const gasPrice = 55000000000

task('accounts', 'Prints the list of accounts', async function () {
  const accounts = await ethers.getSigners()

  for (const account of accounts) {
    console.log(account.address)
  }
})
// TODO add deployment scripts
// TODO add support for ledger for deployment
// TODO use hardhat-deploy, I think that has support for ledger
// TODO Figure out how to get fork work with expectRevert tests. I think this is hardhat bug
module.exports = {
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {
      forking: {
        url: process.env.NODE_URL,
      },
    },
    mainnet: {
      url: process.env.NODE_URL,
      chainId: 1,
      gas: 6700000,
      gasPrice,
    },
  },
  solidity: {
    version: '0.8.3',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
}
