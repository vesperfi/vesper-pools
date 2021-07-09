'use strict'

const {prepareConfig} = require('./config')
const {shouldBehaveLikePool} = require('../behavior/vesper-pool')
const {shouldBehaveLikeMultiPool} = require('../behavior/vesper-multi-pool')
const StrategyType = require('../utils/strategyTypes')
const {BigNumber: BN} = require('ethers')
const DECIMAL6 = BN.from('1000000')
const ONE_MILLION = DECIMAL6.mul('1000000')

/* eslint-disable mocha/no-setup-in-describe */
describe('vUSDC Pool', function () {
  const interestFee = '1500'
  const strategies = [
    {
      name: 'AaveStrategyPolygonUSDC',
      type: StrategyType.AAVE,
      config: {interestFee, debtRatio: 4000, debtRate: ONE_MILLION},
    },
    {
      name: 'AaveStrategyPolygonUSDC',
      type: StrategyType.AAVE,
      config: {interestFee, debtRatio: 4000, debtRate: ONE_MILLION},
    }
  ]
  prepareConfig(strategies, '0xD10D5696A350D65A9AA15FE8B258caB4ab1bF291', '0x7c18646ac536d5186B6F6Fc47D593E4127216C39')
  shouldBehaveLikePool('vUsdc', 'USDC')
  shouldBehaveLikeMultiPool('vUsdc')
})
