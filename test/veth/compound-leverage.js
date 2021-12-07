'use strict'

const { prepareConfig } = require('./config_new')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { shouldBehaveLikeStrategy } = require('../behavior/strategy')
const { shouldMigrateStrategies } = require('../behavior/strategy-migration_new')
const { strategyConfig } = require('../utils/chains').getChainData()

describe('vETH Pool with Compound Leverage Strategy', function () {
  const strategy = strategyConfig.CompoundLeverageStrategyETH
  strategy.config.debtRatio = 9000
  const strategies = [strategy]

  prepareConfig(strategies)
  shouldBehaveLikePool('vETH', 'WETH')
  for (let i = 0; i < strategies.length; i++) {
    shouldBehaveLikeStrategy(i, strategies[i].type, strategies[i].contract)
  }
  shouldMigrateStrategies('vETH')
})
