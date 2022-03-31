'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { shouldBehaveLikeMultiPool } = require('../behavior/vesper-multi-pool')
const network = require('./../utils/network')
const { strategyConfig } = require('../utils/chains').getChainData()

const strategy1 = strategyConfig.AaveStrategyPolygonUSDT
const strategy2 = strategyConfig.AaveStrategyPolygonUSDT

describe('vUSDT Pool', function () {
  if (network.POLYGON === process.env.TEST_CHAIN) {
    strategy1.config.debtRatio = 4000
    strategy2.config.debtRatio = 4000
    const strategies = [strategy1, strategy2]
    prepareConfig(strategies)
    shouldBehaveLikePool('vUSDT', 'USDT')
    shouldBehaveLikeMultiPool('vUSDT')
  }
})
