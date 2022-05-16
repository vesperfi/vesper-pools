'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { shouldBehaveLikeStrategy } = require('../behavior/strategy')
const { shouldMigrateStrategies } = require('../behavior/strategy-migration')
const { strategyConfig } = require('../utils/chains').getChainData()

const POOL_NAME = 'vaAVAX'
const COLLATERAL_NAME = 'AVAX'

describe(`${POOL_NAME} Pool`, function () {
  const strategy = strategyConfig.VesperTraderJoeXYStrategyAVAX
  strategy.config.debtRatio = 9500

  const strategies = [strategy]
  prepareConfig(strategies)
  shouldBehaveLikePool(POOL_NAME, COLLATERAL_NAME)
  for (let i = 0; i < strategies.length; i++) {
    shouldBehaveLikeStrategy(i, strategies[i].type, strategies[i].contract)
  }
  shouldMigrateStrategies(POOL_NAME)
})
