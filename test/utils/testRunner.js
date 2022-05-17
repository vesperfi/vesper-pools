'use strict'

const { getUsers, setupVPool } = require('../utils/setupHelper')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { shouldBehaveLikeStrategy } = require('../behavior/strategy')
const { shouldMigrateStrategies } = require('../behavior/strategy-migration')
const { shouldBehaveLikeMultiStrategyPool } = require('../behavior/vesper-multi-strategy-pool')
const { getChain, getChainData } = require('../utils/chains')
const { poolConfig, strategyConfig } = getChainData()

/**
 * @param {string} poolKey Vesper pool configuration key from poolConfig.js file
 * @param {string[]} strategyKeys Array of strategy configuration keys from strategyConfig.js file
 * @param {object[]} strategyTestParams Array of object of strategy test params like debtRatio
 * @param {any} options Extra options like growToken
 */
function testRunner(poolKey, strategyKeys, strategyTestParams = [{ debtRatio: 9000 }], options) {
  const strategies = []
  const pool = poolConfig[poolKey]

  // Input sanitation
  if (!pool) {
    throw new Error(`${poolKey} configuration does not exist for ${getChain()}`)
  }
  if (strategyKeys.length !== strategyTestParams.length) {
    throw new Error('Strategy configuration array length does not match')
  }

  // Read strategy configuration
  for (let i = 0; i < strategyKeys.length; i++) {
    const name = strategyKeys[i]
    const strategy = strategyConfig[name]
    if (!strategy || !strategy.config) {
      throw new Error(`${name} configuration does not exit for ${getChain()} `)
    }
    // Read customized test params and set those in strategy configuration
    const testParam = strategyTestParams[i]
    Object.keys(testParam).forEach(key => (strategy.config[key] = testParam[key]))
    strategies.push(strategy)
  }

  // Prep pool and collateral name
  const poolName = pool.poolParams[0]
  const collateralSymbol = pool.poolParams[1].split('-')[0].split(/([A-Z]+)/g)[1]

  // Do pool and strategy setup
  beforeEach(async function () {
    const users = await getUsers()
    this.users = users
    await setupVPool(
      this,
      {
        poolConfig: pool,
        strategies: strategies.map((item, i) => ({
          ...item,
          feeCollector: users[i + 8].address, // leave first 8 users for other testing
        })),
      },
      options,
    )
  })

  shouldBehaveLikePool(poolName, collateralSymbol)
  for (let i = 0; i < strategies.length; i++) {
    shouldBehaveLikeStrategy(i, strategies[i].type, strategies[i].contract)
  }
  // TODO run this by default in strategy behavior
  shouldMigrateStrategies(poolName)

  // Only run if we are running more than 1 strategy
  if (strategyKeys.length > 1) {
    shouldBehaveLikeMultiStrategyPool(poolName)
  }
}

module.exports = testRunner
