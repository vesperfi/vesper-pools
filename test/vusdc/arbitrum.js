'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikeStrategy } = require('../behavior/strategy')
const { strategyConfig } = require('../utils/chains').getChainData()

const strategy1 = strategyConfig.Crv2PoolStrategyArbitrumUSDCUSDTPoolUSDC

describe('vUSDC Pool', function () {
  strategy1.config.debtRatio = 10000
  const strategies = [strategy1]

  prepareConfig(strategies)
  shouldBehaveLikeStrategy(0, strategies[0].type, strategies[0].contract)
})
