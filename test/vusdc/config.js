'use strict'

const { getUsers, setupVPool } = require('../utils/setupHelper')
const { poolConfig, strategyConfig } = require('../utils/chains').getChainData()

function prepareConfig(_strategies, options) {
  let strategies = _strategies

  if (!strategies) {
    const strategy1 = strategyConfig.AaveStrategyUSDC
    const strategy2 = strategyConfig.CompoundStrategyUSDC
    strategy1.config.debtRatio = 4000
    strategy2.config.debtRatio = 4000
    strategies = [strategy1, strategy2]
  }

  beforeEach(async function () {
    const users = await getUsers()
    this.users = users
    await setupVPool(
      this,
      {
        poolConfig: poolConfig.VAUSDC,
        feeCollector: users[7].address,
        strategies: strategies.map((item, i) => ({
          ...item,
          feeCollector: users[i + 8].address, // leave first 8 users for other testing
        })),
      },
      options,
    )
  })
  return strategies
}

module.exports = { prepareConfig }
