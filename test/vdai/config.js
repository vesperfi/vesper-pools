'use strict'

const { getUsers, setupVPool } = require('../utils/setupHelper_new')
const { poolConfig, strategyConfig } = require('../utils/chains').getChainData()

function prepareConfig(_strategies) {
  let strategies = _strategies
  if (!strategies) {
    const AaveStrategyDAI = strategyConfig.AaveStrategyDAI
    const CompoundStrategyDAI = strategyConfig.CompoundStrategyDAI
    AaveStrategyDAI.config.debtRatio = 9000
    CompoundStrategyDAI.config.debtRatio = 1000
    strategies = [AaveStrategyDAI, CompoundStrategyDAI]
  }

  beforeEach(async function () {
    const users = await getUsers()
    this.users = users
    await setupVPool(this, {
      poolConfig: poolConfig.VDAI,
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
