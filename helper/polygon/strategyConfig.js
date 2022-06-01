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
    contract: 'AaveStrategy',
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
    contract: 'AaveStrategy',
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
    contract: 'AaveStrategy',
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
    contract: 'AaveStrategy',
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
    contract: 'AaveStrategy',
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
    contract: 'AaveStrategy',
    type: StrategyTypes.AAVE,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Aave.amWMATIC,
      strategyName: 'AaveStrategyWMATIC',
    },
    config: { ...config },
    setup: { ...setup },
  },
  EarnVesperStrategyDAI_WETH: {
    contract: 'EarnVesperStrategy',
    type: StrategyTypes.EARN_VESPER,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Vesper.vDAI,
      dripToken: Address.WETH,
      vsp: Address.Vesper.VSP,
      strategyName: 'EarnVesperStrategyDAI_WETH',
    },
    config: { ...config },
    setup: { ...setup },
  },
  EarnVesperStrategyDAI_WBTC: {
    contract: 'EarnVesperStrategy',
    type: StrategyTypes.EARN_VESPER,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Vesper.vDAI,
      dripToken: Address.WBTC,
      vsp: Address.Vesper.VSP,
      strategyName: 'EarnVesperStrategyDAI_WBTC',
    },
    config: { ...config },
    setup: { ...setup },
  },
}

module.exports = Object.freeze(StrategyConfig)
