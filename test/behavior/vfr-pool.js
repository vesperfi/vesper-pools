'use strict'

const {expect} = require('chai')
const hre = require('hardhat')
const ethers = hre.ethers
const {rebalance, timeTravel} = require('../utils/poolOps')
const {adjustBalance} = require('../utils/balance')
const {deposit, fundBuffer, isCloseEnough} = require('../utils/vfr-common')

const {formatEther, parseEther} = ethers.utils

async function shouldBehaveLikeVFRPool() {
  let collateralGiver, user1, user2, user3
  let stablePool, stableStrategies, coveragePool, coverageStrategies
  let collateralToken, collateralTokenAddress, buffer

  beforeEach(async function () {
    stablePool = this.stable.pool
    coveragePool = this.coverage.pool
    stableStrategies = this.stable.strategies
    coverageStrategies = this.coverage.strategies
    collateralToken = this.stable.collateralToken
    collateralTokenAddress = collateralToken.address
    buffer = this.buffer

    ;[, collateralGiver, user1, user2, user3] = this.users

    for (const user of [user1, user2, user3]) {
      // Clear the collateralToken balance of users
      await adjustBalance(collateralTokenAddress, user.address, 0)
    }
    // Fund the collateral giver account
    await adjustBalance(collateralTokenAddress, collateralGiver.address, ethers.utils.parseEther('1000000'))
  })

  describe('Basic operation tests', function () {
    describe('Stable pool', function () {
      it('checkpointing aggregates the total value of all strategies', async function () {
        // 5% target APY with 0.5% tolerance
        await stablePool.retarget(parseEther('0.05'), parseEther('0.005'))

        await deposit(collateralToken, stablePool, collateralGiver, user1, 1000)
        expect(await stablePool.balanceOf(user1.address)).to.be.gt(0)

        await rebalance(stableStrategies)
        await timeTravel(24 * 3600)
        await rebalance(stableStrategies)

        await stablePool.checkpoint()
        const predictedAPY = await stablePool.predictedAPY()

        expect(isCloseEnough(predictedAPY, parseEther('0.05'), 10)).to.be.true
      })

      it('missed profits are taken from the buffer', async function () {
        // 30% target APY with 0.5% tolerance
        // Sets very high APY to trigger compensation with buffer

        const TARGET_APY = parseEther('0.30')
        const TOLERANCE = parseEther('0.005')
        await stablePool.retarget(TARGET_APY, TOLERANCE)

        await deposit(collateralToken, stablePool, collateralGiver, user1, 500000)
        expect(await stablePool.balanceOf(user1.address)).to.be.gt(0)

        await rebalance(stableStrategies)
        await timeTravel(24 * 3600)

        await stablePool.checkpoint()
        let predictedAPY = await stablePool.predictedAPY()

        if (predictedAPY < TARGET_APY) {
          const needed = await stablePool.amountToReachTarget(stableStrategies[0].instance.address)
          await fundBuffer(collateralToken, buffer, collateralGiver, formatEther(needed))

          await stablePool.checkpoint()
          predictedAPY = await stablePool.predictedAPY()
        }

        expect(isCloseEnough(predictedAPY, TARGET_APY, 10)).to.be.true
      })
    })

    describe('Coverage pool', function () {
      it('profits are sent to the buffer if under target', async function () {
        // 4% target APY with 1% tolerance
        await stablePool.retarget(parseEther('0.04'), parseEther('0.01'))

        await deposit(collateralToken, coveragePool, collateralGiver, user1, 1000)
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
}

module.exports = {shouldBehaveLikeVFRPool}
