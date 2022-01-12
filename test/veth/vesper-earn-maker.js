'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikeStrategy } = require('../behavior/strategy')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { address: Address, strategyConfig } = require('../utils/chains').getChainData()

describe('vETH pool EarnVesperMakerStrategyETH strategy', function () {
  const strategy1 = strategyConfig.EarnVesperMakerStrategyETH
  strategy1.config.debtRatio = 9000
  const strategies = [strategy1]
  prepareConfig(strategies, { growPool: { address: Address.vaDAI } })

  describe('Pool Tests', function () {
    shouldBehaveLikePool('veETH', 'ETH', true)
  })

  for (let i = 0; i < strategies.length; i++) {
    shouldBehaveLikeStrategy(i, strategies[i].type, strategies[i].contract)
  }
})
