'use strict'

const { ethers } = require('hardhat')
const Address = require('./address')
const StrategyTypes = require('../../test/utils/strategyTypes')

const swapManager = Address.SWAP_MANAGER
const interestFee = '1500' // 15%
const config = { interestFee, debtRatio: 0, debtRate: ethers.utils.parseEther('1000000') }

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
    config,
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
  },

  AaveStrategyPolygonWETH: {
    contract: 'AaveStrategyPolygon',
    type: StrategyTypes.AAVE,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Aave.amWETH,
      strategyName: 'AaveStrategyPolygonWETH',
    },
    config,
  },

  AaveStrategyPolygonWMATIC: {
    contract: 'AaveStrategyPolygon',
    type: StrategyTypes.AAVE,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Aave.amWMATIC,
      strategyName: 'AaveStrategyPolygonWMATIC',
    },
    config,
  },
}

module.exports = Object.freeze(StrategyConfig)
