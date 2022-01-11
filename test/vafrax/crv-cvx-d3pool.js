'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { shouldBehaveLikeStrategy } = require('../behavior/strategy')
const { strategyConfig } = require('../utils/chains').getChainData()

describe('vaFRAX Pool with ConvexD3PoolStrategy', function () {
  const strategy = strategyConfig.ConvexD3PoolStrategyFRAX
  strategy.config.debtRatio = 9000
  const strategies = [strategy]
  prepareConfig(strategies)

  describe('Pool Tests', function () {
    shouldBehaveLikePool('vaFRAX', 'FRAX')
  })

  describe('Strategy Tests', function () {
    shouldBehaveLikeStrategy(0, strategies[0].type, strategies[0].contract)
  })
})
