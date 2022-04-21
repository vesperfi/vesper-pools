'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { shouldBehaveLikeStrategy } = require('../behavior/strategy')
const { shouldMigrateStrategies } = require('../behavior/strategy-migration')
const network = require('../utils/network')
const { strategyConfig } = require('../utils/chains').getChainData()

const POOL_NAME = 'vaWBTC'
const COLLATERAL_NAME = 'WBTC'

describe(`${POOL_NAME} Pool`, function () {
  if (network.AVALANCHE === process.env.TEST_CHAIN) {
    const strategy = strategyConfig.BenqiCompoundStrategyAvalancheWBTC
    strategy.config.debtRatio = 9000

    const strategies = [strategy]
    prepareConfig(strategies)
    shouldBehaveLikePool(POOL_NAME, COLLATERAL_NAME)
    for (let i = 0; i < strategies.length; i++) {
      shouldBehaveLikeStrategy(i, strategies[i].type, strategies[i].contract)
    }
    shouldMigrateStrategies(POOL_NAME)
  }
})
