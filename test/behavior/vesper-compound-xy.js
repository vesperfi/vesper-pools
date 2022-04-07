'use strict'

const { expect } = require('chai')
const { ethers } = require('hardhat')
const { getUsers } = require('../utils/setupHelper')
const { deposit, rebalanceStrategy } = require('../utils/poolOps')
const { advanceBlock } = require('../utils/time')
const { adjustBalance } = require('../utils/balance')

async function simulateVesperPoolProfit(strategy) {
  const vPool = await ethers.getContractAt('IVesperPool', await strategy.instance.vPool())
  const collateralTokenAddress = await vPool.token()

  const collateralToken = await ethers.getContractAt('IERC20Metadata', collateralTokenAddress)
  const collateralDecimal = await collateralToken.decimals()
  const poolBalance = await collateralToken.balanceOf(vPool.address)
  await adjustBalance(
    collateralTokenAddress,
    vPool.address,
    poolBalance.add(ethers.utils.parseUnits('5', collateralDecimal)),
  )
}

// Vesper Compound XY strategy specific tests
function shouldBehaveLikeVesperCompoundXYStrategy(strategyIndex) {
  let strategy, pool, collateralToken, token
  let borrowCToken
  let governor, user1, user2

  describe('VesperCompoundXYStrategy specific tests', function () {
    beforeEach(async function () {
      const users = await getUsers()
      ;[governor, user1, user2] = users
      pool = this.pool
      strategy = this.strategies[strategyIndex].instance
      collateralToken = this.collateralToken
      token = await ethers.getContractAt('CToken', this.strategies[strategyIndex].token.address)
      borrowCToken = await ethers.getContractAt('CToken', await strategy.borrowCToken())
    })

    it('Should borrow tokens at rebalance', async function () {
      await deposit(pool, collateralToken, 10, user1)
      await strategy.connect(governor.signer).rebalance()
      const cTokenBalance = await token.balanceOf(strategy.address)
      const borrow = await strategy.borrowBalance()
      const currentBorrow = await borrowCToken.callStatic.borrowBalanceCurrent(strategy.address)
      expect(cTokenBalance).to.be.gt('0', 'Supply CToken balance should be > 0')
      expect(borrow).to.be.gt('0', 'Borrow token balance should be > 0')
      expect(currentBorrow).to.be.gte(borrow, 'Current borrow should be >= borrow balance')
    })

    it('Should borrow within defined limits', async function () {
      await deposit(pool, collateralToken, 10, user2)
      await strategy.connect(governor.signer).rebalance()
      await advanceBlock(100)
      await token.exchangeRateCurrent()
      await borrowCToken.exchangeRateCurrent()
      await strategy.connect(governor.signer).rebalance()

      const borrowRatio = await strategy.currentBorrowRatio()
      const minBorrowRatio = await strategy.minBorrowRatio()
      const maxBorrowRatio = await strategy.maxBorrowRatio()

      expect(borrowRatio).to.be.gte(minBorrowRatio, 'Borrow should be >= min borrow ratio')
      expect(borrowRatio).to.be.lte(maxBorrowRatio, 'Borrow should be <= max borrow ratio')
    })

    it('Should adjust borrow to keep it within defined limits', async function () {
      await deposit(pool, collateralToken, 100, user1)
      await strategy.connect(governor.signer).rebalance()
      await advanceBlock(100)

      await token.exchangeRateCurrent()
      await borrowCToken.exchangeRateCurrent()
      const borrowBefore = await strategy.borrowBalance()

      const withdrawAmount = (await pool.balanceOf(user1.address)).div('2')
      await pool.connect(user1.signer).withdraw(withdrawAmount)

      await token.exchangeRateCurrent()
      await borrowCToken.exchangeRateCurrent()
      const borrowAfter = await strategy.borrowBalance()

      const borrowRatio = await strategy.currentBorrowRatio()
      const minBorrowRatio = await strategy.minBorrowRatio()
      const maxBorrowRatio = await strategy.maxBorrowRatio()

      expect(borrowRatio).to.be.gte(minBorrowRatio, 'Borrow should be >= min borrow ratio')
      expect(borrowRatio).to.be.lte(maxBorrowRatio, 'Borrow should be <= max borrow ratio')
      expect(borrowAfter).to.be.lt(borrowBefore, 'Borrow amount after withdraw should be less')
    })

    it('Should repayAll and reset minBorrowRatio via governor', async function () {
      await deposit(pool, collateralToken, 50, user2)
      await strategy.connect(governor.signer).rebalance()
      let borrowBalance = await strategy.borrowBalance()
      expect(borrowBalance).to.be.gt(0, 'Borrow token balance should be > 0')

      await strategy.connect(governor.signer).repayAll()

      borrowBalance = await strategy.borrowBalance()
      expect(borrowBalance).to.be.eq(0, 'Borrow token balance should be = 0')
      const newMinBorrowRatio = await strategy.minBorrowRatio()
      expect(newMinBorrowRatio).to.be.eq(0, 'minBorrowRatio should be 0')
    })

    it('Should update borrow ratio', async function () {
      await deposit(pool, collateralToken, 100, user1)
      await strategy.connect(governor.signer).rebalance()
      await advanceBlock(100)
      await strategy.connect(governor.signer).updateBorrowRatio(5000, 6000)
      const newMinBorrowRatio = await strategy.minBorrowRatio()
      const minBorrowRatio = await strategy.minBorrowRatio()
      await strategy.connect(governor.signer).rebalance()
      await token.exchangeRateCurrent()
      await borrowCToken.exchangeRateCurrent()
      const borrowRatio = await strategy.currentBorrowRatio()
      expect(borrowRatio).to.be.gte(minBorrowRatio, 'Borrow should be >= min borrow ratio')
      expect(newMinBorrowRatio).to.be.eq(5000, 'Min borrow ratio is wrong')

      let tx = strategy.connect(governor.signer).updateBorrowRatio(5000, 8000)
      await expect(tx).to.be.revertedWith('invalid-max-borrow-ratio')

      tx = strategy.connect(governor.signer).updateBorrowRatio(5500, 5000)
      await expect(tx).to.be.revertedWith('max-should-be-higher-than-min')
    })

    it('Should repay borrow if borrow ratio set to 0', async function () {
      await deposit(pool, collateralToken, 100, user1)
      await rebalanceStrategy(this.strategies[strategyIndex])
      const borrowBefore = await strategy.borrowBalance()
      expect(borrowBefore).to.be.gt(0, 'Borrow amount should be > 0')
      await strategy.connect(governor.signer).updateBorrowRatio(0, 5000)
      await rebalanceStrategy(this.strategies[strategyIndex])
      const borrowAfter = await strategy.borrowBalance()
      expect(borrowAfter).to.be.eq(0, 'Borrow amount should be = 0')
    })

    it('Should calculate totalValue', async function () {
      await deposit(pool, collateralToken, 10, user1)
      await rebalanceStrategy(this.strategies[strategyIndex])
      await advanceBlock(100)
      const totalValue = await strategy.totalValue()
      expect(totalValue).to.be.gt(0, 'loss making strategy')
    })

    it('Underlying vPool should make profits and increase Y balance', async function () {
      await deposit(pool, collateralToken, 10, user1)
      await strategy.connect(governor.signer).rebalance()
      const borrowBefore = await strategy.borrowBalance()
      const totalValue = await strategy.totalValue()
      await simulateVesperPoolProfit(this.strategies[strategyIndex])
      expect(await strategy.borrowBalance()).to.be.gt(borrowBefore)
      await strategy.connect(governor.signer).rebalance()
      await strategy.connect(governor.signer).rebalance()
      expect(await strategy.totalValue()).to.be.gt(totalValue)
    })
  })
}
module.exports = { shouldBehaveLikeVesperCompoundXYStrategy }
