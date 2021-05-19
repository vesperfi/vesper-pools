'use strict'
const {shouldBehaveLikePool} = require('../behavior/vesper-pool')
const {shouldBehaveLikeMultiPool} = require('../behavior/vesper-multi-pool')
const {shouldBehaveLikeStrategy} = require('../behavior/strategy')
const {shouldClaimAaveRewards} = require('../behavior/aave-reward')
const {getUsers, setupVPool} = require('../utils/setupHelper')
const StrategyType = require('../utils/strategyTypes')
const {BigNumber: BN} = require('ethers')
const DECIMAL18 = BN.from('1000000000000000000')
const ONE_MILLION = DECIMAL18.mul('1000000')
/* eslint-disable mocha/no-setup-in-describe */
describe('vUSDC Pool with AaveStrategy', function () {
  const interestFee = '1500' // 15%
  const strategies = [
    {
      name: 'AaveStrategyUSDC',
      type: StrategyType.AAVE,
      config: {interestFee, debtRatio: 4000, debtRate: ONE_MILLION},
    },
    {
      name: 'CompoundStrategyUSDC',
      type: StrategyType.COMPOUND,
      config: {interestFee, debtRatio: 4000, debtRate: ONE_MILLION},
    },
  ]
  beforeEach(async function () {
    const users = await getUsers()
    this.users = users
    await setupVPool(this, {
      poolName: 'VUSDC',
      feeCollector: users[7].address,
      strategies: strategies.map((item, i) => ({
        ...item,
        feeCollector: users[i + 8].address, // leave first 8 users for other testing
      })),
    })
  })

  shouldBehaveLikePool('vUSDC', 'USDC')
  shouldBehaveLikeMultiPool('vUSDC')
  shouldBehaveLikeMultiPool('vDai')
  for (let i = 0; i < strategies.length; i++) {
    shouldBehaveLikeStrategy(i, strategies[i].type, strategies[i].name)
  }
  shouldClaimAaveRewards(0) // run Aave rewards tests
})
