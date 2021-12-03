'use strict'

const { getUsers, setupVPool } = require('../utils/setupHelper_new')
const { poolConfig, strategyConfig } = require('../utils/chains').getChainData()
const AaveStrategyUNI = strategyConfig.AaveStrategyUNI
const CompoundStrategyUNI = strategyConfig.CompoundStrategyUNI

function prepareConfig(_strategies) {
  AaveStrategyUNI.config.debtRatio = 4000
  CompoundStrategyUNI.config.debtRatio = 4000

  const strategies = _strategies || [AaveStrategyUNI, CompoundStrategyUNI]
  beforeEach(async function () {
    const users = await getUsers()
    this.users = users
    await setupVPool(this, {
      poolConfig: poolConfig.VUNI,
      feeCollector: users[7].address,
      strategies: strategies.map((item, i) => ({
        ...item,
        feeCollector: users[i + 8].address, // leave first 8 users for other testing
      })),
    })
  })
  return strategies
}

module.exports = { prepareConfig }
