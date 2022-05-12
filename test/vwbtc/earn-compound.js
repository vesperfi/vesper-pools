'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikeStrategy } = require('../behavior/strategy')

const { address: Address, strategyConfig } = require('../utils/chains').getChainData()
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')

describe('veWBTC pool strategies', function () {
  const strategy = strategyConfig.EarnCompoundStrategyWBTC
  strategy.config.debtRatio = 9000
  const strategies = [strategy]
  prepareConfig(strategies, { growPool: { address: Address.Vesper.vaDAI } })

  describe('Pool Tests', function () {
    shouldBehaveLikePool('veWBTC', 'WBTC', true)
  })

  for (let i = 0; i < strategies.length; i++) {
    shouldBehaveLikeStrategy(i, strategies[i].type, strategies[i].contract)
  }
})
