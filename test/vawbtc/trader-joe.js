'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikeStrategy } = require('../behavior/strategy')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { strategyConfig } = require('../utils/chains').getChainData()

describe('vaWBTC Pool', function () {
  const strategy = strategyConfig.TraderJoeCompoundStrategyAvalancheWBTC
  strategy.config.debtRatio = 9000

  const strategies = [strategy]
  prepareConfig(strategies)
  shouldBehaveLikePool('vaWBTC', 'WBTC')
  for (let i = 0; i < strategies.length; i++) {
    shouldBehaveLikeStrategy(i, strategies[i].type, strategies[i].contract)
  }
  // TODO migration is failing due to dust issue. To be investigated further.
  // shouldMigrateStrategies('vaWBTC')
})
