'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { shouldBehaveLikeStrategy } = require('../behavior/strategy')

const { strategyConfig } = require('../utils/chains').getChainData()

describe('vUSDC Pool', function () {
  const strategy1 = strategyConfig.AlphaLendStrategyUSDC
  strategy1.config.debtRatio = 9000
  const strategies = [strategy1]

  prepareConfig(strategies)
  shouldBehaveLikePool('vUSDC', 'USDC')
  shouldBehaveLikeStrategy(0, strategies[0].type, strategies[0].name)
})
