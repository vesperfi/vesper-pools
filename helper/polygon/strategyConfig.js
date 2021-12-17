'use strict'

const { ethers } = require('hardhat')
const Address = require('./address')
const StrategyTypes = require('../../test/utils/strategyTypes')

const swapManager = Address.SWAP_MANAGER
const interestFee = '2000' // 20%
const config = { interestFee, debtRatio: 0, debtRate: ethers.utils.parseEther('1000000').toString() }
const setup = {
  addressListFactory: Address.ADDRESS_LIST_FACTORY,
  feeCollector: Address.FEE_COLLECTOR,
  keepers: [Address.KEEPER],
}

// TODO update setup to remove strategy type, once done remove type from heres too
const StrategyConfig = {
  AaveStrategyPolygonDAI: {
    contract: 'AaveStrategyPolygon',
    type: StrategyTypes.AAVE,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Aave.amDAI,
      strategyName: 'AaveStrategyPolygonDAI',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },

  AaveStrategyPolygonUSDC: {
    contract: 'AaveStrategyPolygon',
    type: StrategyTypes.AAVE,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Aave.amUSDC,
      strategyName: 'AaveStrategyPolygonUSDC',
    },
    config: { interestFee, debtRatio: 0, debtRate: ethers.utils.parseUnits('1000000', 6) },
    setup: { ...setup },
  },

  AaveStrategyPolygonUSDT: {
    contract: 'AaveStrategyPolygon',
    type: StrategyTypes.AAVE,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Aave.amUSDT,
      strategyName: 'AaveStrategyPolygonUSDT',
    },
    config: { interestFee, debtRatio: 0, debtRate: ethers.utils.parseUnits('1000000', 6) },
    setup: { ...setup },
  },

  AaveStrategyPolygonWBTC: {
    contract: 'AaveStrategyPolygon',
    type: StrategyTypes.AAVE,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Aave.amWBTC,
      strategyName: 'AaveStrategyPolygonWBTC',
    },
    config: { interestFee, debtRatio: 0, debtRate: ethers.utils.parseUnits('1000000', 8) },
    setup: { ...setup },
  },

  AaveStrategyPolygonWETH: {
    contract: 'AaveStrategyPolygon',
    type: StrategyTypes.AAVE,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Aave.amWETH,
      strategyName: 'AaveStrategyPolygonWETH',
    },
    config: { ...config },
    setup: { ...setup },
  },

  AaveStrategyPolygonWMATIC: {
    contract: 'AaveStrategyPolygon',
    type: StrategyTypes.AAVE,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Aave.amWMATIC,
      strategyName: 'AaveStrategyPolygonWMATIC',
    },
    config: { ...config },
    setup: { ...setup },
  },
  EarnVesperStrategyDAIWETH: {
    contract: 'EarnVesperStrategy',
    type: StrategyTypes.EARN_VESPER,
    constructorArgs: {
      swapManager,
      receiptToken: Address.VDAI,
      dripToken: Address.WETH,
      vsp: Address.VSP,
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
      receiptToken: Address.VDAI,
      dripToken: Address.WBTC,
      vsp: Address.VSP,
      strategyName: 'EarnVesperStrategyDAIWBTC',
    },
    config: { ...config },
    setup: { ...setup },
  },
}

module.exports = Object.freeze(StrategyConfig)
