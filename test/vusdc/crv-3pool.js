'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { shouldBehaveLikeStrategy } = require('../behavior/strategy')
const { strategyConfig } = require('../utils/chains').getChainData()

describe('vUSDC Pool with Crv3PoolStrategy', function () {
  const strategy1 = strategyConfig.Crv3PoolStrategyUSDC
  strategy1.config.debtRatio = 10000
  const strategies = [strategy1]
  prepareConfig(strategies)

  describe('Pool Tests', function () {
    shouldBehaveLikePool('vUSDC', 'USDC')
  })

  describe('Strategy Tests', function () {
    shouldBehaveLikeStrategy(0, strategies[0].type, strategies[0].contract)
  })
})
