'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikeStrategy } = require('../behavior/strategy')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { address: Address, strategyConfig } = require('../utils/chains').getChainData()

describe('veETH pool with EarnYearnStrategyETH strategy', function () {
  const strategy = strategyConfig.EarnYearnStrategyETH
  strategy.config.interestFee = 2500
  strategy.config.debtRatio = 9000
  const strategies = [strategy]

  prepareConfig(strategies, { growPool: { address: Address.vaDAI } })

  describe('Pool Tests', function () {
    shouldBehaveLikePool('veETH', 'ETH', true)
  })

  for (let i = 0; i < strategies.length; i++) {
    shouldBehaveLikeStrategy(i, strategies[i].type, strategies[i].contract)
  }
})
