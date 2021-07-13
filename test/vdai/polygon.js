'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { shouldBehaveLikeMultiPool } = require('../behavior/vesper-multi-pool')
const StrategyType = require('../utils/strategyTypes')
const { BigNumber: BN } = require('ethers')
const DECIMAL18 = BN.from('1000000000000000000')
const ONE_MILLION = DECIMAL18.mul('1000000')

/* eslint-disable mocha/no-setup-in-describe */
describe('vDAI Pool', function () {
  const interestFee = '1500'
  const strategies = [
    {
      name: 'AaveStrategyPolygonDAI',
      type: StrategyType.AAVE,
      config: { interestFee, debtRatio: 4000, debtRate: ONE_MILLION },
    },
    {
      name: 'AaveStrategyPolygonDAI',
      type: StrategyType.AAVE,
      config: { interestFee, debtRatio: 4000, debtRate: ONE_MILLION },
    }
  ]
  prepareConfig(strategies, '0xD10D5696A350D65A9AA15FE8B258caB4ab1bF291', '0xefe48370DB8f8Ee343f4f24Ee0B09cC4A8FC3D76')
  shouldBehaveLikePool('vDai', 'DAI')
  shouldBehaveLikeMultiPool('vDai')
})
