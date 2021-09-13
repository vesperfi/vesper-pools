'use strict'

const { expect } = require('chai')
const hre = require('hardhat')
const ethers = hre.ethers
const { DAI, WETH } = require('../../helper/ethereum/address')
const StrategyType = require('../utils/strategyTypes')
const { rebalance, timeTravel } = require('../utils/poolOps')
const { swapExactToken } = require('../utils/tokenSwapper')
const { adjustBalance } = require('../utils/balance')
const {
  deposit,
  fundBuffer,
  isCloseEnough,
  prepareConfig,
} = require('./common')

const { formatEther, parseEther } = ethers.utils

const ONE_MILLION = parseEther('1000000')
const CDAI = '0x5d3a536e4d6dbd6114cc1ead35777bab948e3643'

describe('VFR DAI Non-deterministic', function () {
  let daiGiver, user1, user2, user3
  let stablePool, stableStrategies, coveragePool, coverageStrategies
  let collateralToken, buffer

  // Deterministic behavior with Convex strategies is a bit more involved
  const stableStrategyConfigs = [
    {
      name: 'ConvexStableStrategyDAI',
      type: StrategyType.CURVE,
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
      name: 'ConvexCoverageStrategyDAI',
      type: StrategyType.CURVE,
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
    it('checkpointing aggregates the total value of all strategies', async function () {
      // 5% target APY with 0.5% tolerance
      await stablePool.retarget(parseEther('0.05'), parseEther('0.005'))

      await deposit(collateralToken, stablePool, daiGiver, user1, 1000)
      expect(await stablePool.balanceOf(user1.address)).to.be.gt(0)

      await rebalance(stableStrategies)
      await timeTravel(24 * 3600)
      await rebalance(stableStrategies)

      await stablePool.checkpoint()
      let predictedAPY = await stablePool.predictedAPY()
      if (predictedAPY < parseEther('0.05')) {
        const needed = await stablePool.amountToReachTarget(stableStrategies[0].instance.address)

        const dai = await ethers.getContractAt('ERC20', DAI)
        await dai.connect(daiGiver.signer).transfer(stableStrategies[0].instance.address, needed.div(2))
        await swapExactToken(needed.div(2), [DAI, WETH, CDAI], daiGiver, stableStrategies[1].instance.address)

        await stablePool.checkpoint()
        predictedAPY = await stablePool.predictedAPY()
      }

      expect(isCloseEnough(predictedAPY, parseEther('0.05'), 10)).to.be.true
    })

    it('Should consider strategy loss in checkPoint', async function () {
      // Setting low bar for easy testing
      await stablePool.retarget(parseEther('0.05'), parseEther('0.005'))

      await deposit(collateralToken, stablePool, daiGiver, user1, 1000)
      expect(await stablePool.balanceOf(user1.address)).to.be.gt(0)
      await rebalance(stableStrategies)

      // Manipulate earning so that we can get APY
      const needed = await stablePool.amountToReachTarget(stableStrategies[0].instance.address)
      const dai = await ethers.getContractAt('ERC20', DAI)
      await dai.connect(daiGiver.signer).transfer(stableStrategies[0].instance.address, needed)

      // Manipulate cDAI balance in strategy to report loss
      const cDAI = await ethers.getContractAt('ERC20', CDAI)
      const cDAIBal = await cDAI.balanceOf(stableStrategies[1].instance.address)
      // Update balance to report 100000 wei loss
      await adjustBalance(CDAI, stableStrategies[1].instance.address, cDAIBal.sub(100000))

      await stablePool.checkpoint()
      const predictedAPY = await stablePool.predictedAPY()
      expect(predictedAPY).to.gt(0, 'Incorrect predicted APY')
    })

    it('missed profits are taken from the buffer', async function () {
      // 3% target APY with 0.5% tolerance
      await stablePool.retarget(parseEther('0.03'), parseEther('0.005'))

      await deposit(collateralToken, stablePool, daiGiver, user1, 1000)
      expect(await stablePool.balanceOf(user1.address)).to.be.gt(0)

      await rebalance(stableStrategies)
      await timeTravel(24 * 3600)
      await rebalance(stableStrategies)

      await stablePool.checkpoint()
      let predictedAPY = await stablePool.predictedAPY()
      if (predictedAPY < parseEther('0.03')) {
        const needed = await stablePool.amountToReachTarget(stableStrategies[0].instance.address)
        await fundBuffer(collateralToken, buffer, daiGiver, formatEther(needed))

        await stablePool.checkpoint()
        predictedAPY = await stablePool.predictedAPY()
      }

      expect(isCloseEnough(predictedAPY, parseEther('0.03'), 10)).to.be.true
    })
  })

  describe('Coverage pool', function () {
    it('profits are sent to the buffer if under target', async function () {
      // 4% target APY with 1% tolerance
      await stablePool.retarget(parseEther('0.04'), parseEther('0.01'))

      await deposit(collateralToken, coveragePool, daiGiver, user1, 1000)
      expect(await coveragePool.balanceOf(user1.address)).to.be.gt(0)

      await rebalance(coverageStrategies)
      await timeTravel(5 * 24 * 3600)

      const bufferTarget = await buffer.target()

      const beforeBufferBalance = await collateralToken.balanceOf(buffer.address)
      await rebalance(coverageStrategies)
      const afterBufferBalance = await collateralToken.balanceOf(buffer.address)

      if (beforeBufferBalance.lt(bufferTarget)) {
        expect(afterBufferBalance).to.be.gt(beforeBufferBalance)
      } else {
        expect(afterBufferBalance).to.be.eq(beforeBufferBalance)
      }
    })
  })
})
