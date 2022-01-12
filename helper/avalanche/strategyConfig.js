'use strict'

const { ethers } = require('hardhat')
const Address = require('./address')
const StrategyTypes = require('../../test/utils/strategyTypes')

const swapManager = Address.SWAP_MANAGER
const interestFee = '2000' // 20%
const config = {
  interestFee,
  debtRatio: 0,
  debtRate: ethers.utils.parseEther('1000000').toString(),
  externalDepositFee: 0,
}
const setup = {
  feeCollector: Address.FEE_COLLECTOR,
  keepers: [Address.KEEPER],
}

// TODO update setup to remove strategy type, once done remove type from heres too
const StrategyConfig = {
  AaveStrategyAvalancheDAI: {
    contract: 'AaveStrategyAvalanche',
    type: StrategyTypes.AAVE,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Aave.avDAI,
      strategyName: 'AaveStrategyAvalancheDAI',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },
}

module.exports = Object.freeze(StrategyConfig)
