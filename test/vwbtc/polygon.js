'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { shouldBehaveLikeMultiPool } = require('../behavior/vesper-multi-pool')
const network = require('./../utils/network')
const { strategyConfig } = require('../utils/chains').getChainData()

describe('vWBTC Pool', function () {
  if (network.POLYGON === process.env.TEST_CHAIN) {
    const strategy1 = strategyConfig.AaveStrategyPolygonWBTC
    const strategy2 = strategyConfig.AaveStrategyPolygonWBTC
    strategy1.config.debtRatio = 4000
    strategy2.config.debtRatio = 4000
    const strategies = [strategy1, strategy2]

    prepareConfig(strategies)
    shouldBehaveLikePool('vWBTC', 'WBTC')
    shouldBehaveLikeMultiPool('vWBTC')
  }
})
