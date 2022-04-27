'use strict'

const { prepareConfig } = require('./config')
const network = require('./../utils/network')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { shouldBehaveLikeStrategy } = require('../behavior/strategy')
const { shouldMigrateStrategies } = require('../behavior/strategy-migration')
const { strategyConfig } = require('../utils/chains').getChainData()

describe('vaWBTC Pool', function () {
  if (network.AVALANCHE === process.env.TEST_CHAIN) {
    const strategy = strategyConfig.BenqiStrategyWBTC
    strategy.config.debtRatio = 9000

    const strategies = [strategy]
    prepareConfig(strategies)
    shouldBehaveLikePool('vaWBTC', 'WBTC')
    for (let i = 0; i < strategies.length; i++) {
      shouldBehaveLikeStrategy(i, strategies[i].type, strategies[i].contract)
    }
    shouldMigrateStrategies('vaWBTC')
  }
})
