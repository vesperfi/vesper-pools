'use strict'
const {shouldBehaveLikePool} = require('../behavior/vesper-pool')
const {shouldBehaveLikeMultiPool} = require('../behavior/vesper-multi-pool')
const {shouldMigrateStrategies} = require('../behavior/strategy-migration')
const {shouldBehaveLikeStrategy} = require('../behavior/strategy')
const {getUsers, setupVPool} = require('../utils/setupHelper')
const PoolConfig = require('../../helper/ethereum/poolConfig')
const StrategyType = require('../utils/strategyTypes')
const {ethers} = require('hardhat')
const ONE_MILLION = ethers.utils.parseEther('1000000')

describe('vUSDT Pool', function () {
  const interestFee = '1500' // 15%
  const strategies = [
    {
      name: 'CompoundStrategyUSDT',
      type: StrategyType.COMPOUND,
      config: {interestFee, debtRatio: 4000, debtRate: ONE_MILLION},
    },
    {
      name: 'CompoundStrategyUSDT',
      type: StrategyType.COMPOUND,
      config: {interestFee, debtRatio: 4000, debtRate: ONE_MILLION},
    },
  ]
  beforeEach(async function () {
    const users = await getUsers()
    this.users = users
    await setupVPool(this, {
      poolConfig: PoolConfig.VUSDT,
      feeCollector: users[7].address,
      strategies: strategies.map((item, i) => ({
        ...item,
        feeCollector: users[i + 8].address, // leave first 8 users for other testing
      })),
    })
  })

  shouldBehaveLikePool('vUSDT', 'USDT')
  shouldBehaveLikeMultiPool('vUSDT')
  for (let i = 0; i < strategies.length; i++) {
    shouldBehaveLikeStrategy(i, strategies[i].type, strategies[i].name)
  }
  shouldMigrateStrategies('vUSDT')
})
