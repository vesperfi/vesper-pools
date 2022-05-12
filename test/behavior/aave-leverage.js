'use strict'

const { expect } = require('chai')
const { ethers } = require('hardhat')
const { getUsers } = require('../utils/setupHelper')
const { deposit } = require('../utils/poolOps')
const { advanceBlock } = require('../utils/time')
const network = require('../utils/network')

// Aave Leverage strategy specific tests
function shouldBehaveLikeAaveLeverageStrategy(strategyIndex) {
  let strategy, pool, collateralToken, collateralDecimal, token, vdToken
  let governor, user1, user2

  function calculateAPY(pricePerShare, blockElapsed, decimals = 18) {
    // APY calculation
    const DECIMALS = ethers.BigNumber.from('10').pow(decimals)
    const ONE_YEAR = 60 * 60 * 24 * 365
    const APY = pricePerShare
      .sub(DECIMALS)
      .mul(ONE_YEAR)
      .mul('100')
      .div(blockElapsed * 14)
    const apyInBasisPoints = APY.mul(100).div(DECIMALS).toNumber()
    return apyInBasisPoints / 100
  }

  describe('AaveLeverageStrategy specific tests', function () {
    beforeEach(async function () {
      const users = await getUsers()
      ;[governor, user1, user2] = users
      pool = this.pool
      strategy = this.strategies[strategyIndex].instance
      collateralToken = this.collateralToken
      collateralDecimal = await this.collateralToken.decimals()
      token = this.strategies[strategyIndex].token
      vdToken = await ethers.getContractAt('TokenLike', await strategy.vdToken())
    })

    it('Should work as expected when debtRatio is 0', async function () {
      await deposit(pool, collateralToken, 100, user1)
      await strategy.connect(governor.signer).rebalance()
      let position = await strategy.getPosition()

      expect(position._supply).to.gt(0, 'Incorrect supply')
      expect(position._borrow).to.gt(0, 'Incorrect borrow')
      expect(await pool.totalDebtOf(strategy.address)).to.gt(0, 'Incorrect total debt of strategy')

      const accountant = await ethers.getContractAt('PoolAccountant', await pool.poolAccountant())
      await accountant.updateDebtRatio(strategy.address, 0)

      await strategy.connect(governor.signer).rebalance()
      position = await strategy.getPosition()
      expect(position._supply).to.eq(0, 'Incorrect supply')
      expect(position._borrow).to.eq(0, 'Incorrect borrow')
      expect(await pool.totalDebtOf(strategy.address)).to.eq(0, 'Incorrect total debt of strategy')
    })

    it('Should work as expected when debtRatio is 10%', async function () {
      await deposit(pool, collateralToken, 50, user1)
      await strategy.connect(governor.signer).rebalance()
      let position = await strategy.getPosition()

      expect(position._supply).to.gt(0, 'Incorrect supply')
      expect(position._borrow).to.gt(0, 'Incorrect borrow')
      expect(await pool.totalDebtOf(strategy.address)).to.gt(0, 'Incorrect total debt of strategy')

      const accountant = await ethers.getContractAt('PoolAccountant', await pool.poolAccountant())
      await accountant.updateDebtRatio(strategy.address, 1000)

      await strategy.connect(governor.signer).rebalance()
      position = await strategy.getPosition()
      expect(position._supply).to.gt(0, 'Incorrect supply')
      expect(position._borrow).to.gt(0, 'Incorrect borrow')
      expect(await pool.totalDebtOf(strategy.address)).to.gt(0, 'Incorrect total debt of strategy')
    })

    it('Should borrow collateral at rebalance', async function () {
      const depositAmount = await deposit(pool, collateralToken, 10, user1)
      await strategy.connect(governor.signer).rebalance()
      const collateralBalance = await token.balanceOf(strategy.address)
      expect(collateralBalance).to.gt(depositAmount, 'Leverage should increase collateral')
    })

    it('Should borrow within defined limits', async function () {
      await deposit(pool, collateralToken, 100, user2)
      await strategy.connect(governor.signer).rebalance()
      await strategy.connect(governor.signer).rebalance()

      const minBorrowRatio = await strategy.minBorrowRatio()
      const maxBorrowRatio = await strategy.maxBorrowRatio()
      const borrowRatio = await strategy.currentBorrowRatio()
      expect(borrowRatio).to.eq(minBorrowRatio, 'Borrow should be == min borrow ratio')
      expect(borrowRatio).to.lt(maxBorrowRatio, 'Borrow should be < max borrow ratio')
    })

    it('Should adjust borrow to keep it within defined limits', async function () {
      await deposit(pool, collateralToken, 100, user1)
      await strategy.connect(governor.signer).rebalance()
      await advanceBlock(100)

      const collateralBefore = await token.balanceOf(strategy.address)

      // Withdraw will increase borrow ratio.
      const withdrawAmount = (await pool.balanceOf(user1.address)).div('3')
      await pool.connect(user1.signer).withdraw(withdrawAmount)

      const collateralAfter = await token.balanceOf(strategy.address)
      const minBorrowRatio = await strategy.minBorrowRatio()
      const maxBorrowRatio = await strategy.maxBorrowRatio()
      let borrowRatio = await strategy.currentBorrowRatio()
      expect(borrowRatio).to.gt(minBorrowRatio, 'Borrow should be > min borrow ratio')
      expect(borrowRatio).to.lte(maxBorrowRatio, 'Borrow should be <= max borrow ratio')

      expect(collateralAfter).to.lt(collateralBefore, 'Borrow amount after withdraw should be less')

      // Rebalance may adjust borrow ratio to equal to min. If ratio is between min and max then do nothing.
      await strategy.connect(governor.signer).rebalance()
      borrowRatio = await strategy.currentBorrowRatio()
      expect(borrowRatio).to.gte(minBorrowRatio, 'Borrow should be >= min borrow ratio')
      expect(borrowRatio).to.lt(maxBorrowRatio, 'Borrow should be < max borrow ratio')
    })

    it('Should verify that Aave flash loan works', async function () {
      await strategy.connect(governor.signer).updateFlashLoanStatus(false, true)
      await deposit(pool, collateralToken, 100, user1)
      await strategy.connect(governor.signer).rebalance()
      await advanceBlock(100)

      // Withdraw will increase borrow ratio
      const withdrawAmount = (await pool.balanceOf(user1.address)).div('2')
      await pool.connect(user1.signer).withdraw(withdrawAmount)

      const minBorrowRatio = await strategy.minBorrowRatio()
      const maxBorrowRatio = await strategy.maxBorrowRatio()
      let borrowRatio = await strategy.currentBorrowRatio()
      expect(borrowRatio).to.gte(minBorrowRatio, 'Borrow should be >= min borrow ratio')
      expect(borrowRatio).to.lte(maxBorrowRatio, 'Borrow should be <= max borrow ratio')

      // Rebalance may adjust borrow ratio to equal to min. If ratio is between min and max then do nothing.
      await strategy.connect(governor.signer).rebalance()
      borrowRatio = await strategy.currentBorrowRatio()
      // Due to Aave flash loan fee borrow ration will be higher than min
      expect(borrowRatio).to.gt(minBorrowRatio, 'Borrow should be > min borrow ratio')
      expect(borrowRatio).to.lt(maxBorrowRatio, 'Borrow should be < max borrow ratio')
    })

    it('Should verify that DyDx flash loan works', async function () {
      if (!process.env.TEST_CHAIN || network.MAINNET === process.env.TEST_CHAIN) {
        await strategy.connect(governor.signer).updateFlashLoanStatus(true, false)
        await deposit(pool, collateralToken, 100, user1)
        await strategy.connect(governor.signer).rebalance()
        await advanceBlock(100)

        // Withdraw will increase borrow ratio
        const withdrawAmount = (await pool.balanceOf(user1.address)).div('3')
        await pool.connect(user1.signer).withdraw(withdrawAmount)

        const minBorrowRatio = await strategy.minBorrowRatio()
        const maxBorrowRatio = await strategy.maxBorrowRatio()
        let borrowRatio = await strategy.currentBorrowRatio()
        expect(borrowRatio).to.gte(minBorrowRatio, 'Borrow should be >= min borrow ratio')
        expect(borrowRatio).to.lte(maxBorrowRatio, 'Borrow should be <= max borrow ratio')

        // Rebalance may adjust borrow ratio to equal to min. If ratio is between min and max then do nothing.
        await strategy.connect(governor.signer).rebalance()
        borrowRatio = await strategy.currentBorrowRatio()
        expect(borrowRatio).to.gte(minBorrowRatio, 'Borrow should be equal to min borrow ratio')
        expect(borrowRatio).to.lt(maxBorrowRatio, 'Borrow should be < max borrow ratio')
      } else {
        // eslint-disable-next-line no-console
        console.log('Skipping test:: No DYDX support on %s ', process.env.TEST_CHAIN.toUpperCase())
      }
    })

    it('Should update borrow ratio', async function () {
      const minRatio = (await strategy.minBorrowRatio()).add(200)
      let maxRatio = minRatio.add(300)
      await deposit(pool, collateralToken, 100, user2)
      await strategy.connect(governor.signer).rebalance()
      await advanceBlock(100)
      const borrowRatioBefore = await strategy.currentBorrowRatio()
      await strategy.connect(governor.signer).updateBorrowRatio(minRatio, maxRatio)
      const newMinBorrowRatio = await strategy.minBorrowRatio()
      expect(newMinBorrowRatio).to.eq(minRatio, 'Min borrow limit is wrong')
      const newMaxBorrowRatio = await strategy.maxBorrowRatio()
      expect(newMaxBorrowRatio).to.eq(maxRatio, 'Max borrow limit is wrong')

      await strategy.connect(governor.signer).rebalance()
      const borrowRatioAfter = await strategy.currentBorrowRatio()
      expect(borrowRatioAfter).to.gt(borrowRatioBefore, 'Borrow ratio after should be greater')
      expect(parseInt(borrowRatioAfter) - parseInt(newMinBorrowRatio)).to.lt(1, 'Borrow should be ~= min borrow ratio')
      maxRatio = 9500
      let tx = strategy.connect(governor.signer).updateBorrowRatio(minRatio, maxRatio)
      await expect(tx).to.revertedWith('21')
      maxRatio = minRatio.sub(100)
      tx = strategy.connect(governor.signer).updateBorrowRatio(minRatio, maxRatio)
      await expect(tx).to.revertedWith('22')
    })

    it('Should repay borrow if borrow limit set to 0', async function () {
      await deposit(pool, collateralToken, 100, user1)
      await strategy.connect(governor.signer).rebalance()
      const borrowBefore = await vdToken.balanceOf(strategy.address)
      expect(borrowBefore).to.gt(0, 'Borrow amount should be > 0')
      await strategy.connect(governor.signer).updateBorrowRatio(0, 4000)
      await strategy.connect(governor.signer).rebalance()
      const borrowAfter = await vdToken.balanceOf(strategy.address)
      expect(borrowAfter).to.eq(0, 'Borrow amount should be = 0')
    })

    it('Should get rewardToken token as reserve token', async function () {
      expect(await strategy.isReservedToken(await strategy.rewardToken())).to.equal(true, 'rewardToken is reserved')
    })

    it('Should calculate totalValue', async function () {
      await deposit(pool, collateralToken, 10, user1)
      await strategy.connect(governor.signer).rebalance()
      await advanceBlock(100)
      const totalValue = await strategy.totalValue()
      const totalDebt = await pool.totalDebtOf(strategy.address)
      expect(totalValue).to.gt(totalDebt, 'loss making strategy')
    })

    it('Should calculate APY', async function () {
      /* eslint-disable no-console */
      await deposit(pool, collateralToken, 10, user1)
      let blockNumberStart = (await ethers.provider.getBlock()).number
      console.log('\n1st rebalance to supply and borrow')
      let minBorrowRatio = await strategy.minBorrowRatio()
      console.log('Borrowing upto', minBorrowRatio.toNumber() / 100, '% of collateral')
      await strategy.connect(governor.signer).rebalance()
      console.log('Mining 100 blocks')
      await advanceBlock(100)
      console.log('Another Rebalance')
      await strategy.connect(governor.signer).rebalance()
      let pricePerShare = await pool.pricePerShare()
      let blockNumberEnd = (await ethers.provider.getBlock()).number
      let blockElapsed = blockNumberEnd - blockNumberStart
      console.log('APY::', calculateAPY(pricePerShare, blockElapsed, collateralDecimal))

      console.log('\nUpdating borrow limit and calculating APY again')
      await strategy.connect(governor.signer).updateBorrowRatio(4000, 4500)
      blockNumberStart = (await ethers.provider.getBlock()).number
      minBorrowRatio = await strategy.minBorrowRatio()
      console.log('Borrowing upto', minBorrowRatio.toNumber() / 100, '% of collateral')
      await strategy.connect(governor.signer).rebalance()
      console.log('Mining 100 blocks')
      await advanceBlock(100)
      await strategy.connect(governor.signer).rebalance()
      pricePerShare = await pool.pricePerShare()
      blockNumberEnd = (await ethers.provider.getBlock()).number
      blockElapsed = blockNumberEnd - blockNumberStart
      console.log('APY::', calculateAPY(pricePerShare, blockElapsed, collateralDecimal))
      /* eslint-enable no-console */
    })
  })
}
module.exports = { shouldBehaveLikeAaveLeverageStrategy }
