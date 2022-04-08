'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { shouldBehaveLikeStrategy } = require('../behavior/strategy')
const { shouldMigrateStrategies } = require('../behavior/strategy-migration')
const { strategyConfig } = require('../utils/chains').getChainData()

describe('vWBTC Pool with Compound XY Strategy', function () {
  const strategy = strategyConfig.CompoundXYStrategyWBTC
  strategy.config.debtRatio = 9000
  const strategies = [strategy]
  prepareConfig(strategies)
  shouldBehaveLikePool('vWBTC', 'WBTC')
  for (let i = 0; i < strategies.length; i++) {
    shouldBehaveLikeStrategy(i, strategies[i].type, strategies[i].contract)
  }
  shouldMigrateStrategies('vWBTC')
})
