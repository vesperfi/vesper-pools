'use strict'
const { prepareConfig } = require('./config')
const { shouldBehaveLikeStrategy } = require('../behavior/strategy')
const { strategyConfig } = require('../utils/chains').getChainData()
describe('vaWBTC pool strategies', function () {
  const strategy = strategyConfig.VesperMakerStrategyWBTC
  strategy.config.debtRatio = '9500' // 90%
  const strategies = [strategy]
  prepareConfig(strategies)

  for (let i = 0; i < strategies.length; i++) {
    shouldBehaveLikeStrategy(i, strategies[i].type, strategies[i].contract)
  }
})
