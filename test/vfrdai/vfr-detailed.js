'use strict'

const {expect} = require('chai')
const {ethers} = require('hardhat')

const {DAI} = require('../../helper/ethereum/address')
const StrategyType = require('../utils/strategyTypes')
const {rebalance, timeTravel} = require('../utils/poolOps')
const {adjustBalance} = require('../utils/balance')
const {deposit, withdraw, isCloseEnough, prepareConfig} = require('./common')

const {parseEther} = ethers.utils

const ONE_MILLION = parseEther('1000000')

describe('VFR DAI Detailed tests (non-deterministic)', function () {
  let daiGiver, user1, user2, user3
  let stablePool, stableStrategies, coveragePool, coverageStrategies
  let collateralToken

  const stableStrategyConfigs = [
    {
      name: 'CompoundStableStrategyDAI',
      type: StrategyType.COMPOUND,
      config: {interestFee: 1500, debtRatio: 5000, debtRate: ONE_MILLION},
    },
    {
      name: 'CompoundStableStrategyDAI',
      type: StrategyType.COMPOUND,
      config: {interestFee: 1500, debtRatio: 5000, debtRate: ONE_MILLION},
    },
  ]

  const coverageStrategyConfigs = [
    {
      name: 'CompoundCoverageStrategyDAI',
      type: StrategyType.COMPOUND,
      config: {interestFee: 1500, debtRatio: 5000, debtRate: ONE_MILLION},
    },
    {
      name: 'CompoundCoverageStrategyDAI',
      type: StrategyType.COMPOUND,
      config: {interestFee: 1500, debtRatio: 5000, debtRate: ONE_MILLION},
    },
  ]

  before(async function () {
    await prepareConfig(stableStrategyConfigs, coverageStrategyConfigs)
  })

  beforeEach(async function () {
    ;[, daiGiver, user1, user2, user3] = this.users

    for (const user of [user1, user2, user3]) {
      // Clear the DAI balance of users
      await adjustBalance(DAI, user.address, 0)
    }
    // Fund the DAI giver account
    await adjustBalance(DAI, daiGiver.address, ethers.utils.parseEther('10000000000'))

    stablePool = this.stable.pool
    coveragePool = this.coverage.pool
    stableStrategies = this.stable.strategies
    coverageStrategies = this.coverage.strategies
    collateralToken = this.stable.collateralToken
  })

  async function nextCheckpoint() {
    // Waits 1 Day worth of time and blocks for realistic APY prediction
    // Then triggers rebalance for both stable and coverage pools
    // And then triggers the checkpoint

    await timeTravel(0, 6450, 'compound')
    await timeTravel(24 * 3600)
    await rebalance(stableStrategies)
    await rebalance(coverageStrategies)
    await stablePool.checkpoint()
  }

  describe('Large deposit / Large withdrawal', function () {
    it('Large deposit should not impact APY negatively', async function () {
      // 2% target APY with 1% tolerance
      await stablePool.retarget(parseEther('0.02'), parseEther('0.01'))

      // User 1 deposits 1000 DAI
      await deposit(collateralToken, stablePool, daiGiver, user1, 1000)
      await rebalance(stableStrategies)
      await rebalance(coverageStrategies)

      await nextCheckpoint()

      // User 2 deposits 1M DAI
      await deposit(collateralToken, stablePool, daiGiver, user2, 1000000)
      await rebalance(stableStrategies)
      await rebalance(coverageStrategies)

      await nextCheckpoint()

      expect(isCloseEnough(await stablePool.targetAPY(), await stablePool.predictedAPY())).to.be.true
    })

    it('Large withdrawal should not impact APY negatively', async function () {
      // 2% target APY with 1% tolerance
      await stablePool.retarget(parseEther('0.02'), parseEther('0.01'))

      // User 1 deposits 1M DAI
      await deposit(collateralToken, stablePool, daiGiver, user1, 1000000)
      await rebalance(stableStrategies)
      await rebalance(coverageStrategies)

      await nextCheckpoint()

      // User 2 deposits 1000 DAI
      await deposit(collateralToken, stablePool, daiGiver, user2, 1000)
      await rebalance(stableStrategies)
      await rebalance(coverageStrategies)

      await nextCheckpoint()

      // User 1 withdraws its big share after lock up period elapsed
      await timeTravel(5 * 24 * 3600)
      await withdraw(stablePool, user1)

      await rebalance(stableStrategies)
      await rebalance(coverageStrategies)
      await stablePool.checkpoint()

      // Predicted APY should be still in range even after >90% withdrawal
      expect(isCloseEnough(await stablePool.targetAPY(), await stablePool.predictedAPY())).to.be.true
    })
  })

  describe('Large / small coverage pool', function () {
    it('Larger Coverage pool should sustain APY for a longer period', async function () {
      // Purposely set unrealistic APY in order to trigger coverage request
      // 5% target APY with 0.5% tolerance
      await stablePool.retarget(parseEther('0.05'), parseEther('0.005'))

      // Seed coveragePool with 1M DAI
      await deposit(collateralToken, coveragePool, daiGiver, user1, 1000000)
      await rebalance(coverageStrategies)

      // Deposit 5M DAI in stablePool
      await deposit(collateralToken, stablePool, daiGiver, user1, 5000000)
      await rebalance(stableStrategies)

      await nextCheckpoint()
      expect(await stablePool.depositsHalted()).to.be.false
      await nextCheckpoint()
      expect(await stablePool.depositsHalted()).to.be.false
      await nextCheckpoint() // after 3 days
      expect(await stablePool.depositsHalted()).to.be.true
    })

    it('Smaller Coverage pool can\'t sustain unrealistic APY', async function () {
      // Purposely set unrealistic APY in order to trigger coverage request
      // 5% target APY with 0.5% tolerance
      await stablePool.retarget(parseEther('0.05'), parseEther('0.005'))

      // Seed coveragePool with 100K DAI
      await deposit(collateralToken, coveragePool, daiGiver, user1, 100000)
      await rebalance(coverageStrategies)

      // Deposit 5M DAI in stablePool
      await deposit(collateralToken, stablePool, daiGiver, user1, 5000000)
      await rebalance(stableStrategies)

      await nextCheckpoint()
      expect(await stablePool.depositsHalted()).to.be.true
    })
  })

  describe('Pools initial bootstrapping', function () {
    it('7 days bootstrapping', async function () {
      // 3% target APY with 1% tolerance
      await stablePool.retarget(parseEther('0.03'), parseEther('0.01'))

      // Seed coveragePool with 1M DAI
      await deposit(collateralToken, coveragePool, daiGiver, user1, 1000000)
      await rebalance(coverageStrategies)

      // Deposit 100K DAI in stablePool
      await deposit(collateralToken, stablePool, daiGiver, user1, 100000)
      await rebalance(stableStrategies)

      for (let i = 0; i < 7; i++) {
        await nextCheckpoint()
      }
      expect(await stablePool.depositsHalted()).to.be.false

      // Deposit 5M DAI in stablePool
      await deposit(collateralToken, stablePool, daiGiver, user2, 5000000)
      await rebalance(stableStrategies)
      await nextCheckpoint()

      expect(await stablePool.depositsHalted()).to.be.false

      // Purposely set unrealistic APY
      // 6% target APY with 1% tolerance
      await stablePool.retarget(parseEther('0.06'), parseEther('0.01'))

      await nextCheckpoint()
      // Can CoveragePool handle 1 day of unrealistic APY after 7 days warming up?
      // If yes, deposits won't be halted
      expect(await stablePool.depositsHalted()).to.be.false

    })
  })
})
