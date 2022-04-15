'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikeStrategy } = require('../behavior/strategy')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { shouldMigrateStrategies } = require('../behavior/strategy-migration')
const network = require('../utils/network')
const { strategyConfig } = require('../utils/chains').getChainData()

const strategy1 = strategyConfig.AaveStrategyAvalancheDAI

describe('vDAI Pool', function () {
  if (network.AVALANCHE === process.env.TEST_CHAIN) {
    strategy1.config.debtRatio = 9000

    const strategies = [strategy1]
    prepareConfig(strategies)
    shouldBehaveLikePool('vDAI', 'DAI')
    shouldBehaveLikeStrategy(0, strategies[0].type, strategies[0].contract)
    shouldMigrateStrategies('vDAI')
  }
})
