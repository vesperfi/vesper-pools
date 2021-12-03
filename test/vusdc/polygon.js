'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { shouldBehaveLikeMultiPool } = require('../behavior/vesper-multi-pool_new')
const { strategyConfig } = require('../utils/chains').getChainData()

const strategy1 = strategyConfig.AaveStrategyPolygonUSDC
const strategy2 = strategyConfig.AaveStrategyPolygonUSDC

describe('vUSDC Pool', function () {
  strategy1.config.debtRatio = 4000
  strategy2.config.debtRatio = 4000
  const strategies = [strategy1, strategy2]
  prepareConfig(strategies)
  shouldBehaveLikePool('vUsdc', 'USDC')
  shouldBehaveLikeMultiPool('vUsdc')
})
