'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { shouldBehaveLikeStrategy } = require('../behavior/strategy')
const { strategyConfig } = require('../utils/chains').getChainData()

describe('vUSDC Pool with YearnStrategyUSDC', function () {
  const strategy = strategyConfig.YearnStrategyUSDC
  strategy.config.debtRatio = 9000
  const strategies = [strategy]
  prepareConfig(strategies)
  shouldBehaveLikePool('vUSDC', 'USDC')
  shouldBehaveLikeStrategy(0, strategies[0].type, strategies[0].contract)
})
