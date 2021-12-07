'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { shouldBehaveLikeStrategy } = require('../behavior/strategy')
const { strategyConfig } = require('../utils/chains').getChainData()

describe('vUNI Pool with Compound Leverage Strategy', function () {
  const strategy = strategyConfig.CompoundLeverageStrategyUNI
  strategy.config.debtRatio = 9000
  const strategies = [strategy]
  prepareConfig(strategies)
  shouldBehaveLikePool('vUNI', 'UNI')
  for (let i = 0; i < strategies.length; i++) {
    shouldBehaveLikeStrategy(i, strategies[i].type, strategies[i].contract)
  }
})
