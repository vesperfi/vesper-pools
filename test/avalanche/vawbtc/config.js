'use strict'

const { getUsers, setupVPool } = require('../../utils/setupHelper')
const { poolConfig } = require('../../utils/chains').getChainData()

function prepareConfig(_strategies) {
  const strategies = _strategies

  beforeEach(async function () {
    const users = await getUsers()
    this.users = users
    await setupVPool(this, {
      poolConfig: poolConfig.VAWBTCe,
      strategies: strategies.map((item, i) => ({
        ...item,
        feeCollector: users[i + 8].address, // leave first 8 users for other testing
      })),
    })
  })
  return strategies
}

module.exports = { prepareConfig }
