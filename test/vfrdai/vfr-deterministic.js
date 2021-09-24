'use strict'

const { expect } = require('chai')
const { ethers } = require('hardhat')

const { DAI, WETH } = require('../../helper/ethereum/address')
const StrategyType = require('../utils/strategyTypes')
const { rebalance, timeTravel } = require('../utils/poolOps')
const { swapExactToken } = require('../utils/tokenSwapper')
const { adjustBalance } = require('../utils/balance')
const {
  deposit,
  withdraw,
  fundBuffer,
  getBlockTime,
  getPoolAPY,
  getUserAPY,
  isCloseEnough,
  prepareConfig,
  stablePoolIsWithinTarget
} = require('./common')

const { parseEther } = ethers.utils

const ONE = parseEther('1')
const ONE_MILLION = parseEther('1000000')
const COMP = '0xc00e94cb662c3520282e6f5717214004a7f26888'

describe('VFR DAI Deterministic', function () {
  let daiGiver, user1, user2, user3
  let stablePool, stableStrategies, coveragePool, coverageStrategies
  let collateralToken, buffer

  async function earnStrategyAPY(pool, strategy, apy) {
    // Get strategy information
    const strategyInfo = await pool.strategy(strategy.instance.address)
    const fee = strategyInfo[1]
    const totalDebt = strategyInfo[4]

    // Get current time and VFR start time
    const currentTime = await getBlockTime()
    const startTime = await stablePool.startTime()

    // Compute the profit needed to achieve the requested APY
    const neededProfitWithoutFee = totalDebt.mul(apy).mul(currentTime - startTime).div(ONE.mul(365 * 24 * 3600))
    const neededProfit = neededProfitWithoutFee.mul(10000).div(ethers.BigNumber.from(10000).sub(fee))

    // Clear all accumulated profits and mimick earning strategy a fixed profit
    await adjustBalance(COMP, strategy.instance.address, 0)
    const CDAI = '0x5d3a536e4d6dbd6114cc1ead35777bab948e3643'
    await swapExactToken(neededProfit, [DAI, WETH, CDAI], daiGiver, strategy.instance.address)
  }

  // It's very easy to set up deterministic behavior with Compound strategies
  const stableStrategyConfigs = [
    {
      name: 'CompoundStableStrategyDAI',
      type: StrategyType.COMPOUND,
      config: { interestFee: 1500, debtRatio: 5000, debtRate: ONE_MILLION },
    },
    {
      name: 'CompoundStableStrategyDAI',
      type: StrategyType.COMPOUND,
      config: { interestFee: 1500, debtRatio: 5000, debtRate: ONE_MILLION },
    },
  ]

  const coverageStrategyConfigs = [
    {
      name: 'CompoundCoverageStrategyDAI',
      type: StrategyType.COMPOUND,
      config: { interestFee: 1500, debtRatio: 5000, debtRate: ONE_MILLION },
    },
    {
      name: 'CompoundCoverageStrategyDAI',
      type: StrategyType.COMPOUND,
      config: { interestFee: 1500, debtRatio: 5000, debtRate: ONE_MILLION },
    },
  ]

  before(async function () {
    await prepareConfig(stableStrategyConfigs, coverageStrategyConfigs)
  })

  beforeEach(async function () {
    [, daiGiver, user1, user2, user3] = this.users

    for (const user of [user1, user2, user3]) {
      // Clear the DAI balance of users
      await adjustBalance(DAI, user.address, 0)
    }
    // Fund the DAI giver account
    await adjustBalance(DAI, daiGiver.address, ethers.utils.parseEther('1000000'))

    stablePool = this.stable.pool
    coveragePool = this.coverage.pool
    stableStrategies = this.stable.strategies
    coverageStrategies = this.coverage.strategies
    collateralToken = this.stable.collateralToken
    buffer = this.buffer
  })

  describe('Stable pool', function () {

    it('disallow withdraw if lock period is not expired', async function () {
      // 5% target APY with 1% tolerance
      await stablePool.retarget(parseEther('0.05'), parseEther('0.01'))

      await deposit(collateralToken, stablePool, daiGiver, user1, 1000)
      expect(await stablePool.balanceOf(user1.address)).to.be.gt(0)

      await rebalance(stableStrategies)
      await timeTravel(1 * 24 * 3600)

      await expect(withdraw(stablePool, user1)).to.be.revertedWith('lock-period-not-expired')
      await expect(stablePool.connect(user1.signer).transfer(user2.address, 1)).to.be.revertedWith(
        'lock-period-not-expired'
      )

      const lockPeriod = (await stablePool.lockPeriod()).toNumber()
      await timeTravel(lockPeriod)

      await withdraw(stablePool, user1)

    })

    it('disallow deposits if pool is under target by more than tolerance', async function () {
      // 5% target APY with 1% tolerance
      await stablePool.retarget(parseEther('0.05'), parseEther('0.01'))

      const depositTx = await deposit(collateralToken, stablePool, daiGiver, user1, 1000)
      expect(await stablePool.balanceOf(user1.address)).to.be.gt(0)

      await rebalance(stableStrategies)
      await timeTravel(2 * 24 * 3600)

      // Each strategy earns 2% APY
      await earnStrategyAPY(stablePool, stableStrategies[0], parseEther('0.02'))
      await earnStrategyAPY(stablePool, stableStrategies[1], parseEther('0.02'))
      await rebalance(stableStrategies)

      await stablePool.checkpoint()
      // predicted APY is 2%
      expect(isCloseEnough(await stablePool.predictedAPY(), parseEther('0.02'), 10)).to.be.true

      // user1 earned a 2% APY
      expect(isCloseEnough(await getUserAPY(stablePool, depositTx, 1000), parseEther('0.02'), 10)).to.be.true
      // pool earned a 2% APY
      expect(isCloseEnough(await getPoolAPY(stablePool), parseEther('0.02'), 10)).to.be.true
      // Deposits are halted
      await expect(deposit(collateralToken, stablePool, daiGiver, user2, 1000)).to.be.revertedWith('pool-under-target')
    })

    it('allow deposits if pool is under target but by no more than tolerance', async function () {
      // 5% target APY with 1% tolerance
      await stablePool.retarget(parseEther('0.05'), parseEther('0.01'))

      const depositTx = await deposit(collateralToken, stablePool, daiGiver, user1, 1000)
      expect(await stablePool.balanceOf(user1.address)).to.be.gt(0)

      await rebalance(stableStrategies)
      await timeTravel(2 * 24 * 3600)

      // Each strategy earns 0.45% APY
      await earnStrategyAPY(stablePool, stableStrategies[0], parseEther('0.045'))
      await earnStrategyAPY(stablePool, stableStrategies[1], parseEther('0.045'))

      // The checkpoint will predict the APY based on unreported profits within the strategies
      await stablePool.checkpoint()
      // predicted APY is 0.45%
      expect(isCloseEnough(await stablePool.predictedAPY(), parseEther('0.045'), 10)).to.be.true

      await rebalance(stableStrategies)

      // user1 APY is 0.45%
      expect(isCloseEnough(await getUserAPY(stablePool, depositTx, 1000), parseEther('0.045'), 10)).to.be.true

      // Deposits are not halted
      await deposit(collateralToken, stablePool, daiGiver, user2, 1000)
      expect(await stablePool.balanceOf(user2.address)).to.be.gt(0)
    })

    it('excess profits are sent to the buffer', async function () {
      // 5% target APY with 1% tolerance
      await stablePool.retarget(parseEther('0.05'), parseEther('0.01'))

      const depositTx = await deposit(collateralToken, stablePool, daiGiver, user1, 1000)
      expect(await stablePool.balanceOf(user1.address)).to.be.gt(0)

      await rebalance(stableStrategies)
      await timeTravel(2 * 24 * 3600)

      // Each strategy earns 0.6% APY
      await earnStrategyAPY(stablePool, stableStrategies[0], parseEther('0.06'))
      await earnStrategyAPY(stablePool, stableStrategies[1], parseEther('0.06'))

      const beforeBufferBalance = await collateralToken.balanceOf(buffer.address)
      await rebalance(stableStrategies)
      const afterBufferBalance = await collateralToken.balanceOf(buffer.address)

      // pool should be on target
      expect(await stablePoolIsWithinTarget(stablePool)).to.be.true

      // user1 APY is 5%
      expect(isCloseEnough(await getUserAPY(stablePool, depositTx, 1000), parseEther('0.05'))).to.be.true
      // pool APY is 5%
      expect(isCloseEnough(await getPoolAPY(stablePool), parseEther('0.05'))).to.be.true
      // buffer got funded the additional profits above the pool's target APY
      expect(afterBufferBalance).to.be.gt(beforeBufferBalance)
    })

    it('missed profits are taken from the buffer', async function () {
      // 5% target APY with 1% tolerance
      await stablePool.retarget(parseEther('0.05'), parseEther('0.01'))

      const depositTx = await deposit(collateralToken, stablePool, daiGiver, user1, 1000)
      await timeTravel(2 * 24 * 3600)

      await rebalance(stableStrategies)
      await timeTravel(5 * 24 * 3600)

      // Each strategy earns 0.1% APY
      await earnStrategyAPY(stablePool, stableStrategies[0], parseEther('0.01'))
      await earnStrategyAPY(stablePool, stableStrategies[1], parseEther('0.01'))

      // Funds the buffer
      await fundBuffer(collateralToken, buffer, daiGiver, 1000)

      // The checkpoint will predict the APY based on the funds available in the buffer
      await stablePool.checkpoint()
      // predicted APY is 0.45%
      expect(isCloseEnough(await stablePool.predictedAPY(), parseEther('0.05'))).to.be.true

      await rebalance(stableStrategies)

      // pool should be on target
      expect(await stablePoolIsWithinTarget(stablePool)).to.be.true
      // user1 APY is 5%
      expect(isCloseEnough(await getUserAPY(stablePool, depositTx, 1000), parseEther('0.05'))).to.be.true
      // pool APY is 5%
      expect(isCloseEnough(await getPoolAPY(stablePool), parseEther('0.05'))).to.be.true
    })
  })

  describe('Coverage pool', function () {
    it('profits are sent to buffer until it reaches target', async function () {
      // 1% target APY with 0.1% tolerance
      await stablePool.retarget(parseEther('0.01'), parseEther('0.001'))

      await deposit(collateralToken, stablePool, daiGiver, user1, 1000)
      await rebalance(stableStrategies)
      await deposit(collateralToken, coveragePool, daiGiver, user1, 1000)
      await rebalance(coverageStrategies)

      await timeTravel(24 * 3600)

      await earnStrategyAPY(coveragePool, coverageStrategies[0], parseEther('0.02'))
      await rebalance(coverageStrategies)

      // All profits were sent to the buffer
      expect(isCloseEnough(await coveragePool.pricePerShare(), parseEther('1'), 100000)).to.be.true

      await stablePool.checkpoint()
      expect(await collateralToken.balanceOf(buffer.address)).to.be.gt(0)
      // Stable pool achieved target via the buffer
      expect(isCloseEnough(await stablePool.predictedAPY(), parseEther('0.01'))).to.be.true
    })

    it('above target buffer funds can be requested by the coverage pool', async function () {
      // 1% target APY with 0.1% tolerance
      await stablePool.retarget(parseEther('0.01'), parseEther('0.001'))

      await deposit(collateralToken, stablePool, daiGiver, user1, 1000)
      await rebalance(stableStrategies)
      await deposit(collateralToken, coveragePool, daiGiver, user1, 1000)
      await rebalance(coverageStrategies)

      await timeTravel(24 * 3600)

      await earnStrategyAPY(stablePool, stableStrategies[0], parseEther('0.04'))
      await earnStrategyAPY(stablePool, stableStrategies[1], parseEther('0.04'))
      await rebalance(stableStrategies)
      await rebalance(coverageStrategies)

      await stablePool.checkpoint()
      expect(await collateralToken.balanceOf(buffer.address)).to.be.gt(0)
      // Stable pool achieved target via the buffer
      expect(isCloseEnough(await stablePool.predictedAPY(), parseEther('0.01'))).to.be.true

      // Above target buffer funds are relayed to the coverage pool
      expect(isCloseEnough(await coveragePool.pricePerShare(), parseEther('1'), 100000)).to.be.false
    })
  })

  describe('Auto-retargeting Stable pool', function () {

    it('Should increase +1% target APY if prediction average is higher', async function () {
      // 5% target APY with 1% tolerance
      await stablePool.retarget(parseEther('0.05'), parseEther('0.01'))
      await deposit(collateralToken, stablePool, daiGiver, user1, 1000)
      await rebalance(stableStrategies)

      // Each strategy earns 4% APY
      await timeTravel(24 * 3600)
      await timeTravel(0,100,'compound')
      await earnStrategyAPY(stablePool, stableStrategies[0], parseEther('0.04'))
      await earnStrategyAPY(stablePool, stableStrategies[1], parseEther('0.04'))
      await rebalance(stableStrategies)
      await stablePool.checkpoint()
      const oldAvgPredictedAPY = await stablePool.avgPredictedAPY()

      // Pushes APY prediction above target APY (~7%)
      await timeTravel(24 * 3600)
      await timeTravel(0,100,'compound')
      await earnStrategyAPY(stablePool, stableStrategies[0], parseEther('0.07'))
      await earnStrategyAPY(stablePool, stableStrategies[1], parseEther('0.07'))
      await rebalance(stableStrategies)
      await stablePool.checkpoint()
      
      expect(await stablePool.avgPredictedAPY()).to.be.gt(oldAvgPredictedAPY)

      const oldTargetAPY = await stablePool.targetAPY()
      await stablePool.autoRetarget()

      expect(await stablePool.targetAPY()).to.be.gt(oldTargetAPY)

    })

    it('Should decrease -1% target APY if prediction average is lower', async function () {
      // 5% target APY with 1% tolerance
      await stablePool.retarget(parseEther('0.05'), parseEther('0.01'))
      await deposit(collateralToken, stablePool, daiGiver, user1, 1000)
      await rebalance(stableStrategies)

      // Each strategy earns 3% APY
      await timeTravel(24 * 3600)
      await timeTravel(0,100,'compound')
      await earnStrategyAPY(stablePool, stableStrategies[0], parseEther('0.03'))
      await earnStrategyAPY(stablePool, stableStrategies[1], parseEther('0.03'))
      await rebalance(stableStrategies)
      await stablePool.checkpoint()
  
      const oldTargetAPY = await stablePool.targetAPY()
      await stablePool.autoRetarget()

      expect(await stablePool.targetAPY()).to.be.lt(oldTargetAPY)

    })

  })
})
