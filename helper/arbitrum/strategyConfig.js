'use strict'

const Address = require('./address')
const StrategyTypes = require('../../test/utils/strategyTypes')

const swapManager = Address.Vesper.SWAP_MANAGER
const config = { debtRatio: 0, externalDepositFee: 0 }

const setup = {
  feeCollector: Address.Vesper.FEE_COLLECTOR,
  keepers: [Address.Vesper.KEEPER],
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
