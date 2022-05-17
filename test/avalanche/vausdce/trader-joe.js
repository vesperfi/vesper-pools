'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikeStrategy } = require('../../behavior/strategy')
const { shouldBehaveLikePool } = require('../../behavior/vesper-pool')
const { shouldMigrateStrategies } = require('../../behavior/strategy-migration')
const { strategyConfig } = require('../../utils/chains').getChainData()

describe('vaUSDCe Pool', function () {
  const strategy = strategyConfig.TraderJoeStrategyUSDCe
  strategy.config.debtRatio = 9000

  const strategies = [strategy]
  prepareConfig(strategies)
  shouldBehaveLikePool('vaUSDCe', 'USDCe')
  for (let i = 0; i < strategies.length; i++) {
    shouldBehaveLikeStrategy(i, strategies[i].type, strategies[i].contract)
  }
  shouldMigrateStrategies('vaUSDCe')
})
