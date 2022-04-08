'use strict'

const { expect } = require('chai')
const { ethers } = require('hardhat')
const { getUsers } = require('../utils/setupHelper')
const { deposit, rebalanceStrategy } = require('../utils/poolOps')
const { advanceBlock } = require('../utils/time')

// VesperAaveXY strategy specific tests
function shouldBehaveLikeVesperAaveXYStrategy(strategyIndex) {
  let strategy, pool, collateralToken, vdToken
  let governor, user1, user2

  describe('VesperAaveXYStrategy specific tests', function () {
    beforeEach(async function () {
      const users = await getUsers()
      ;[governor, user1, user2] = users
      pool = this.pool
      strategy = this.strategies[strategyIndex].instance
      collateralToken = this.collateralToken
      vdToken = await ethers.getContractAt('TokenLike', await strategy.vdToken())
    })

    it('Should borrow collateral at rebalance', async function () {
      await deposit(pool, collateralToken, 10, user1)
      await strategy.connect(governor.signer).rebalance()
      const position = await strategy.getPosition()

      expect(position._borrow).to.be.gt(0, 'Could not borrow from Aave')
      expect(await vdToken.balanceOf(strategy.address)).to.be.gt(0, 'Debt token is zero')
    })

    it('Should borrow within defined limits', async function () {
      await deposit(pool, collateralToken, 100, user2)
      await strategy.connect(governor.signer).rebalance()
      await strategy.connect(governor.signer).rebalance()

      const minBorrowRatio = await strategy.minBorrowRatio()
      const maxBorrowRatio = await strategy.maxBorrowRatio()
      const borrowRatio = await strategy.currentBorrowRatio()
      expect(borrowRatio).to.gt(minBorrowRatio.sub(10), 'Borrow should be == min borrow ratio')
      expect(borrowRatio).to.lt(maxBorrowRatio.add(10), 'Borrow should be < max borrow ratio')
    })

    it('Should adjust borrow to keep it within defined limits', async function () {
      await deposit(pool, collateralToken, 100, user1)
      await strategy.connect(governor.signer).rebalance()
      await advanceBlock(100)

      // Withdraw will increase borrow ratio.
      const withdrawAmount = (await pool.balanceOf(user1.address)).div('3')
      await pool.connect(user1.signer).withdraw(withdrawAmount)

      const minBorrowRatio = await strategy.minBorrowRatio()
      const maxBorrowRatio = await strategy.maxBorrowRatio()
      let borrowRatio = await strategy.currentBorrowRatio()
      expect(borrowRatio).to.gt(minBorrowRatio.sub(50), 'Borrow should be > min borrow ratio')
      expect(borrowRatio).to.lte(maxBorrowRatio, 'Borrow should be <= max borrow ratio')

      // Rebalance will bring back borrow ratio to min borrow ratio
      await rebalanceStrategy(this.strategies[strategyIndex])
      await rebalanceStrategy(this.strategies[strategyIndex])

      borrowRatio = await strategy.currentBorrowRatio()
      expect(borrowRatio).to.gt(minBorrowRatio.sub(50), 'Borrow should be == min borrow ratio')
      expect(borrowRatio).to.lt(maxBorrowRatio, 'Borrow should be < max borrow ratio')
    })

    it('Borrowed Y amount should reflect in target Vesper Pool', async function () {
      await deposit(pool, collateralToken, 100, user1)
      await strategy.connect(governor.signer).rebalance()
      await rebalanceStrategy(this.strategies[strategyIndex])

      const borrowBalance = await vdToken.balanceOf(strategy.address)
      const vPool = await ethers.getContractAt('IVesperPool', await strategy.vPool())
      const vPoolBalance = await vPool.balanceOf(strategy.address)
      const vPoolPricePerShare = await vPool.pricePerShare()
      const investedBorrowBalance = vPoolBalance.mul(vPoolPricePerShare).div(ethers.utils.parseEther('1'))

      expect(borrowBalance).to.be.lte(investedBorrowBalance, 'Borrowed balance not reflecting in Vesper Pool')
    })

    it('Should update borrow config', async function () {
      await deposit(pool, collateralToken, 100, user2)
      await strategy.connect(governor.signer).rebalance()
      await advanceBlock(100)
      const borrowRatioBefore = await strategy.currentBorrowRatio()
      await strategy.connect(governor.signer).updateBorrowRatio(5100, 5500)
      const newMinBorrowRatio = await strategy.minBorrowRatio()
      expect(newMinBorrowRatio).to.eq(5100, 'Min borrow limit is wrong')
      const newMaxBorrowRatio = await strategy.maxBorrowRatio()
      expect(newMaxBorrowRatio).to.eq(5500, 'Max borrow limit is wrong')
      await strategy.connect(governor.signer).rebalance()
      const borrowRatioAfter = await strategy.currentBorrowRatio()
      expect(borrowRatioAfter).to.gt(borrowRatioBefore, 'Borrow ratio after should be greater')
      expect(parseInt(borrowRatioAfter) - parseInt(newMinBorrowRatio)).to.lt(1, 'Borrow should be ~= min borrow ratio')

      let tx = strategy.connect(governor.signer).updateBorrowRatio(5500, 9500)
      await expect(tx).to.revertedWith('invalid-max-borrow-limit')

      tx = strategy.connect(governor.signer).updateBorrowRatio(5500, 5000)
      await expect(tx).to.revertedWith('max-should-be-higher-than-min')

      tx = strategy.connect(governor.signer).updateBorrowRatio(5500, 5000)
      await expect(tx).to.revertedWith('max-should-be-higher-than-min')
    })
  })
}
module.exports = { shouldBehaveLikeVesperAaveXYStrategy }
