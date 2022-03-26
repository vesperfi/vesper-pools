'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikeStrategy } = require('../behavior/strategy')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { strategyConfig } = require('../utils/chains').getChainData()

describe('veWBTC pool EarnVesperMakerStrategyWBTC strategy', function () {
  const strategy = strategyConfig.EarnVesperMakerStrategyWBTC
  strategy.config.debtRatio = 9000
  const strategies = [strategy]
  prepareConfig(strategies)

  describe('Pool Tests', function () {
    shouldBehaveLikePool('veWBTC', 'WBTC', true)
  })

  for (let i = 0; i < strategies.length; i++) {
    shouldBehaveLikeStrategy(i, strategies[i].type, strategies[i].contract)
  }
})
