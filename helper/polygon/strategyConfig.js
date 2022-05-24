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
  AaveStrategyDAI: {
    contract: 'AaveStrategyPolygon',
    type: StrategyTypes.AAVE,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Aave.amDAI,
      strategyName: 'AaveStrategyDAI',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },

  AaveStrategyUSDC: {
    contract: 'AaveStrategyPolygon',
    type: StrategyTypes.AAVE,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Aave.amUSDC,
      strategyName: 'AaveStrategyUSDC',
    },
    config: { ...config },
    setup: { ...setup },
  },

  AaveStrategyUSDT: {
    contract: 'AaveStrategyPolygon',
    type: StrategyTypes.AAVE,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Aave.amUSDT,
      strategyName: 'AaveStrategyUSDT',
    },
    config: { ...config },
    setup: { ...setup },
  },

  AaveStrategyWBTC: {
    contract: 'AaveStrategyPolygon',
    type: StrategyTypes.AAVE,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Aave.amWBTC,
      strategyName: 'AaveStrategyWBTC',
    },
    config: { ...config },
    setup: { ...setup },
  },

  AaveStrategyWETH: {
    contract: 'AaveStrategyPolygon',
    type: StrategyTypes.AAVE,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Aave.amWETH,
      strategyName: 'AaveStrategyWETH',
    },
    config: { ...config },
    setup: { ...setup },
  },

  AaveStrategyWMATIC: {
    contract: 'AaveStrategyPolygon',
    type: StrategyTypes.AAVE,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Aave.amWMATIC,
      strategyName: 'AaveStrategyWMATIC',
    },
    config: { ...config },
    setup: { ...setup },
  },
  EarnVesperStrategyDAIWETH: {
    contract: 'EarnVesperStrategy',
    type: StrategyTypes.EARN_VESPER,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Vesper.vDAI,
      dripToken: Address.WETH,
      vsp: Address.Vesper.VSP,
      strategyName: 'EarnVesperStrategyDAIWETH',
    },
    config: { ...config },
    setup: { ...setup },
  },
  EarnVesperStrategyDAIWBTC: {
    contract: 'EarnVesperStrategy',
    type: StrategyTypes.EARN_VESPER,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Vesper.vDAI,
      dripToken: Address.WBTC,
      vsp: Address.Vesper.VSP,
      strategyName: 'EarnVesperStrategyDAIWBTC',
    },
    config: { ...config },
    setup: { ...setup },
  },
}

module.exports = Object.freeze(StrategyConfig)
