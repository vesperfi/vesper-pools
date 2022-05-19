'use strict'

const { expect } = require('chai')
const { ethers } = require('hardhat')
const { getUsers } = require('../utils/setupHelper')
const { deposit, rebalanceStrategy } = require('../utils/poolOps')
const { advanceBlock } = require('../utils/time')
const { adjustBalance } = require('../utils/balance')
const { calculateAPY } = require('../utils/apy')
const { BigNumber } = require('ethers')

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
  let strategy, pool, collateralToken, supplyCToken, comptroller, oracle
  let borrowCToken, borrowToken, borrowTokenPrice, supplyTokenPrice
  let governor, user1, user2
  const DECIMAL18 = ethers.utils.parseUnits('1', 18)
  async function assertCurrentBorrow() {
    const borrowed = await borrowCToken.borrowBalanceStored(strategy.address)
    borrowTokenPrice = await oracle.getUnderlyingPrice(borrowCToken.address)
    supplyTokenPrice = await oracle.getUnderlyingPrice(supplyCToken.address)
    const collateralSupplied = (await supplyCToken.balanceOf(strategy.address))
      .mul(await supplyCToken.exchangeRateStored())
      .div(DECIMAL18)
    const cf = (await comptroller.markets(supplyCToken.address)).collateralFactorMantissa
    const maxBorrowPossible = collateralSupplied.mul(cf).div(DECIMAL18).mul(supplyTokenPrice).div(borrowTokenPrice)
    const borrowUpperBound = maxBorrowPossible.mul(await strategy.maxBorrowLimit()).div(BigNumber.from('10000'))
    const borrowLowerBound = maxBorrowPossible.mul(await strategy.minBorrowLimit()).div(BigNumber.from('10000'))
    expect(borrowed).to.be.lt(borrowUpperBound, 'Borrow more than max limit')
    expect(borrowed).to.be.closeTo(
      borrowLowerBound,
      borrowLowerBound.mul(1).div(100),
      'borrowed is too much deviated from minBorrowLimit',
    )
  }
  describe('VesperCompoundXYStrategy specific tests', function () {
    beforeEach(async function () {
      const users = await getUsers()
      ;[governor, user1, user2] = users
      pool = this.pool
      strategy = this.strategies[strategyIndex].instance
      collateralToken = this.collateralToken
      supplyCToken = await ethers.getContractAt('CToken', this.strategies[strategyIndex].token.address)
      borrowCToken = await ethers.getContractAt('CToken', await strategy.borrowCToken())
      borrowToken = await ethers.getContractAt('IERC20Metadata', await strategy.borrowToken())
      const comptrollerAddress = await strategy.comptroller()
      comptroller = await ethers.getContractAt('Comptroller', comptrollerAddress)
      const oracleAddress = await comptroller.oracle()
      oracle = await ethers.getContractAt('Oracle', oracleAddress)
    })

    it('Validate that vPool is reserved token', async function () {
      const isReserved = await strategy.isReservedToken(await strategy.vPool())
      expect(isReserved).to.be.eq(true, 'VPool should be reserved token')
    })

    it('Should borrow tokens at rebalance', async function () {
      await deposit(pool, collateralToken, 10, user1)
      await strategy.connect(governor.signer).rebalance()
      const cTokenBalance = await supplyCToken.balanceOf(strategy.address)
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
      await supplyCToken.exchangeRateCurrent()
      await borrowCToken.exchangeRateCurrent()
      await strategy.connect(governor.signer).rebalance()
      await assertCurrentBorrow()
    })

    it('Should adjust borrow to keep it within defined limits', async function () {
      await deposit(pool, collateralToken, 100, user1)
      await strategy.connect(governor.signer).rebalance()
      await advanceBlock(100)

      await supplyCToken.exchangeRateCurrent()
      await borrowCToken.exchangeRateCurrent()
      const borrowBefore = await strategy.borrowBalance()

      const withdrawAmount = (await pool.balanceOf(user1.address)).div('2')
      await pool.connect(user1.signer).withdraw(withdrawAmount)

      await supplyCToken.exchangeRateCurrent()
      await borrowCToken.exchangeRateCurrent()
      const borrowAfter = await strategy.borrowBalance()
      await assertCurrentBorrow()
      expect(borrowAfter).to.be.lt(borrowBefore, 'Borrow amount after withdraw should be less')
    })

    it('Should repayAll and reset minBorrowLimit via governor', async function () {
      await deposit(pool, collateralToken, 50, user2)
      await strategy.connect(governor.signer).rebalance()
      let borrowBalance = await strategy.borrowBalance()
      expect(borrowBalance).to.be.gt(0, 'Borrow token balance should be > 0')

      await strategy.connect(governor.signer).repayAll()

      borrowBalance = await strategy.borrowBalance()
      expect(borrowBalance).to.be.eq(0, 'Borrow token balance should be = 0')
      const newMinBorrowLimit = await strategy.minBorrowLimit()
      expect(newMinBorrowLimit).to.be.eq(0, 'minBorrowRatio should be 0')
    })

    it('Should update borrow limit', async function () {
      await deposit(pool, collateralToken, 100, user1)
      await strategy.connect(governor.signer).rebalance()
      await advanceBlock(100)
      await strategy.connect(governor.signer).updateBorrowLimit(5000, 6000)
      const newMinBorrowLimit = await strategy.minBorrowLimit()
      await strategy.connect(governor.signer).rebalance()
      await supplyCToken.exchangeRateCurrent()
      await borrowCToken.exchangeRateCurrent()
      await assertCurrentBorrow()
      expect(newMinBorrowLimit).to.be.eq(5000, 'Min borrow limit is wrong')

      let tx = strategy.connect(governor.signer).updateBorrowLimit(5000, ethers.constants.MaxUint256)
      await expect(tx).to.be.revertedWith('invalid-max-borrow-limit')

      tx = strategy.connect(governor.signer).updateBorrowLimit(5500, 5000)
      await expect(tx).to.be.revertedWith('max-should-be-higher-than-min')
    })

    it('Should repay borrow if borrow limit set to 0', async function () {
      await deposit(pool, collateralToken, 100, user1)
      await strategy.connect(governor.signer).rebalance()
      const borrowBefore = await strategy.borrowBalance()
      expect(borrowBefore).to.be.gt(0, 'Borrow amount should be > 0')
      await strategy.connect(governor.signer).updateBorrowLimit(0, 0)
      await strategy.connect(governor.signer).rebalance()
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

    context('Calculate APY', function () {
      it('Should calculate APY', async function () {
        /* eslint-disable no-console */
        const XY = `${await collateralToken.symbol()}-${await borrowToken.symbol()}`
        await deposit(pool, collateralToken, 10, user1)
        const blockNumberStart = (await ethers.provider.getBlock()).number
        await strategy.connect(governor.signer).rebalance()
        await advanceBlock(100)
        await strategy.connect(governor.signer).rebalance()
        let blockNumberEnd = (await ethers.provider.getBlock()).number
        let pricePerShare = await pool.pricePerShare()
        let blockElapsed = blockNumberEnd - blockNumberStart
        console.log(`\nAPY for ${XY}::`, calculateAPY(pricePerShare, blockElapsed))
        console.log('Calculating APY again over 100  more blocks')
        await advanceBlock(100)
        await strategy.connect(governor.signer).rebalance()
        pricePerShare = await pool.pricePerShare()
        blockNumberEnd = (await ethers.provider.getBlock()).number
        blockElapsed = blockNumberEnd - blockNumberStart
        console.log(`APY for ${XY}::`, calculateAPY(pricePerShare, blockElapsed))
        /* eslint-enable no-console */
      })
    })
  })
}
module.exports = { shouldBehaveLikeVesperCompoundXYStrategy }
