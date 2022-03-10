'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { shouldBehaveLikeStrategy } = require('../behavior/strategy')
const { strategyConfig } = require('../utils/chains').getChainData()

describe('vaWBTC Pool with Convex4MetaPoolStrategyIBBTCPool', function () {
  const strategy1 = strategyConfig.Convex4MetaPoolStrategyIBBTCPoolWBTC
  strategy1.config.debtRatio = 10000
  const strategies = [strategy1]
  prepareConfig(strategies)

  describe('Pool Tests', function () {
    shouldBehaveLikePool('vaWBTC', 'WBTC')
  })

  describe('Strategy Tests', function () {
    shouldBehaveLikeStrategy(0, strategies[0].type, strategies[0].contract)
  })
})
