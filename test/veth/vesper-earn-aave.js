'use strict'

const { getUsers, setupVPool, setupEarnDrip } = require('../utils/setupHelper_new')
const { shouldBehaveLikeStrategy } = require('../behavior/strategy')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')

const { poolConfig, strategyConfig } = require('../utils/chains').getChainData()
const EarnAaveStrategyWETH = strategyConfig.EarnAaveStrategyWETH

describe('veETH pool strategies', function () {
  EarnAaveStrategyWETH.config.interestFee = '2500' // 25%
  EarnAaveStrategyWETH.config.debtRatio = '9000' // 90%

  const strategies = [EarnAaveStrategyWETH]
  // TODO use config.js once it's update to latest configuration
  // prepareConfig(strategies)
  beforeEach(async function () {
    const users = await getUsers()
    this.users = users
    await setupVPool(this, {
      poolConfig: poolConfig.VAETH,
      feeCollector: users[7].address,
      strategies: strategies.map((item, i) => ({
        ...item,
        feeCollector: users[i + 8].address, // leave first 8 users for other testing
      })),
    })
  })
  setupEarnDrip()

  describe('Pool Tests', function () {
    shouldBehaveLikePool('veETH', 'ETH', true)
  })

  for (let i = 0; i < strategies.length; i++) {
    shouldBehaveLikeStrategy(i, strategies[i].type, strategies[i].contract)
  }
})
