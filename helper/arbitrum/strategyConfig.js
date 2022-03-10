'use strict'

const { ethers } = require('hardhat')
const Address = require('./address')
const StrategyTypes = require('../../test/utils/strategyTypes')

const swapManager = Address.SWAP_MANAGER
const interestFee = '2000' // 20%
const config = { interestFee, debtRatio: 0, debtRate: ethers.utils.parseEther('1000000').toString() }
const setup = {
  feeCollector: Address.FEE_COLLECTOR,
  keepers: [Address.KEEPER],
}

// TODO update setup to remove strategy type, once done remove type from heres too
const StrategyConfig = {
  Crv2PoolStrategyArbitrumUSDCUSDTPoolUSDC: {
    contract: 'Crv2PoolStrategyArbitrumUSDCUSDTPool',
    type: StrategyTypes.CURVE,
    constructorArgs: {
      swapManager,
      collateralIdx: 0,
      strategyName: 'Crv2PoolStrategyArbitrumUSDCUSDTPoolUSDC',
    },
    config: { ...config },
    setup: { ...setup },
  },
}

module.exports = Object.freeze(StrategyConfig)
