'use strict'

const { getUsers, setupVPool } = require('../utils/setupHelper_new')
const { poolConfig, strategyConfig } = require('../utils/chains').getChainData()

function prepareConfig(_strategies) {
  let strategies = _strategies
  if (!strategies) {
    const strategy1 = strategyConfig.AlphaLendStrategyLINK
    const strategy2 = strategyConfig.AlphaLendStrategyLINK
    strategy1.config.debtRatio = 9000
    strategy2.config.debtRatio = 0
    strategies = [strategy1, strategy2]
  }

  beforeEach(async function () {
    const users = await getUsers()
    this.users = users
    await setupVPool(this, {
      poolConfig: poolConfig.VLINK,
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
