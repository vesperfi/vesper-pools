'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikeStrategy } = require('../behavior/strategy')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { strategyConfig } = require('../utils/chains').getChainData()

describe('veETH pool strategies', function () {
  const strategy = strategyConfig.EarnCompoundStrategyETH
  strategy.config.interestFee = 2500
  strategy.config.debtRatio = 9000
  const strategies = [strategy]
  prepareConfig(strategies)

  describe('Pool Tests', function () {
    shouldBehaveLikePool('veETH', 'ETH', true)
  })

  for (let i = 0; i < strategies.length; i++) {
    shouldBehaveLikeStrategy(i, strategies[i].type, strategies[i].contract)
  }
})
