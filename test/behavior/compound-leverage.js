'use strict'

const { expect } = require('chai')
const { ethers } = require('hardhat')
const { getUsers } = require('../utils/setupHelper')
const { deposit } = require('../utils/poolOps')
const { advanceBlock } = require('../utils/time')

const comptrollerAddress = '0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B'
const compAddress = '0xc00e94Cb662C3520282E6f5717214004A7f26888'

// Compound Leverage strategy specific tests
function shouldBehaveLikeCompoundLeverageStrategy(strategyIndex) {
  let strategy, pool, collateralToken, token
  let governor, user1, user2


  function calculateAPY(pricePerShare, blockElapsed) {
    // APY calculation
    const ETHER = ethers.utils.parseEther('1')
    const ONE_YEAR = 60 * 60 * 24 * 365
    const APY = pricePerShare.sub(ETHER).mul(ONE_YEAR).mul('100').div(blockElapsed * 14)
    const apyInBasisPoints = APY.mul(100).div(ETHER).toNumber()
    return apyInBasisPoints / 100
  }

  describe('CompoundLeverageStrategy specific tests', function () {
    beforeEach(async function () {
      const users = await getUsers()
        ;[governor, user1, user2] = users
      pool = this.pool
      strategy = this.strategies[strategyIndex].instance
      collateralToken = this.collateralToken
      token = this.strategies[strategyIndex].token
    })

    it('Should borrow collateral at rebalance', async function () {
      const depositAmount = await deposit(pool, collateralToken, 10, user1)
      await strategy.connect(governor.signer).rebalance()
      const collateralBalance = await token.callStatic.balanceOfUnderlying(strategy.address)
      expect(collateralBalance).to.gt(depositAmount, 'Leverage should increase collateral')
    })

    it('Should borrow within defined limits', async function () {
      await deposit(pool, collateralToken, 100, user2)
      await strategy.connect(governor.signer).rebalance()
      await token.exchangeRateCurrent()
      await strategy.connect(governor.signer).rebalance()

      const range = await strategy.borrowRatioRange()
      const borrowRatio = await strategy.currentBorrowRatio()
      expect(borrowRatio).to.eq(range._minBorrowRatio, 'Borrow should be == min borrow ratio')
      expect(borrowRatio).to.lt(range._maxBorrowRatio, 'Borrow should be < max borrow ratio')
    })

    it('Should adjust borrow to keep it within defined limits', async function () {
      await deposit(pool, collateralToken, 100, user1)
      await strategy.connect(governor.signer).rebalance()
      await advanceBlock(100)

      await token.exchangeRateCurrent()
      const collateralBefore = await token.callStatic.balanceOfUnderlying(strategy.address)
      // Withdraw will increase borrow ratio
      const withdrawAmount = (await pool.balanceOf(user1.address)).div('2')
      await pool.connect(user1.signer).withdraw(withdrawAmount)

      await token.exchangeRateCurrent()
      const collateralAfter = await token.callStatic.balanceOfUnderlying(strategy.address)
      let range = await strategy.borrowRatioRange()
      let borrowRatio = await strategy.currentBorrowRatio()
      expect(borrowRatio).to.gte(range._minBorrowRatio, 'Borrow should be >= min borrow ratio')
      expect(borrowRatio).to.lte(range._maxBorrowRatio, 'Borrow should be <= max borrow ratio')
      expect(collateralAfter).to.lt(collateralBefore, 'Borrow amount after withdraw should be less')

      // Rebalance will bring back borrow ratio to min borrow ratio
      await strategy.connect(governor.signer).rebalance()
      range = await strategy.borrowRatioRange()
      borrowRatio = await strategy.currentBorrowRatio()
      expect(borrowRatio).to.eq(range._minBorrowRatio, 'Borrow should be == min borrow ratio')
      expect(borrowRatio).to.lt(range._maxBorrowRatio, 'Borrow should be < max borrow ratio')
    })

    it('Should verify that aave flash loan works', async function () {
      await strategy.connect(governor.signer).updateDyDxStatus(false)
      await strategy.connect(governor.signer).updateAaveStatus(true)
      await deposit(pool, collateralToken, 100, user1)
      await strategy.connect(governor.signer).rebalance()
      await advanceBlock(100)

      // Withdraw will increase borrow ratio
      const withdrawAmount = (await pool.balanceOf(user1.address)).div('2')
      await pool.connect(user1.signer).withdraw(withdrawAmount)

      let range = await strategy.borrowRatioRange()
      let borrowRatio = await strategy.currentBorrowRatio()
      expect(borrowRatio).to.gte(range._minBorrowRatio, 'Borrow should be >= min borrow ratio')
      expect(borrowRatio).to.lte(range._maxBorrowRatio, 'Borrow should be <= max borrow ratio')

      // Rebalance will bring back borrow ratio to min borrow ratio
      await strategy.connect(governor.signer).rebalance()
      range = await strategy.borrowRatioRange()
      borrowRatio = await strategy.currentBorrowRatio()
      // Due to Aave flash loan fee borrow ration will be higher than min
      expect(borrowRatio).to.gt(range._minBorrowRatio, 'Borrow should be > min borrow ratio')
      expect(borrowRatio).to.lt(range._maxBorrowRatio, 'Borrow should be < max borrow ratio')
    })

    it('Should verify that normal leverage/deleverage works', async function () {
      await strategy.connect(governor.signer).updateDyDxStatus(false)
      await strategy.connect(governor.signer).updateAaveStatus(false)
      await deposit(pool, collateralToken, 100, user1)
      await strategy.connect(governor.signer).rebalance()
      await advanceBlock(100)

      // Withdraw will increase borrow ratio
      const withdrawAmount = (await pool.balanceOf(user1.address)).div('2')
      await pool.connect(user1.signer).withdraw(withdrawAmount)

      let range = await strategy.borrowRatioRange()
      let borrowRatio = await strategy.currentBorrowRatio()
      expect(borrowRatio).to.gte(range._minBorrowRatio, 'Borrow should be >= min borrow ratio')
      expect(borrowRatio).to.lte(range._maxBorrowRatio, 'Borrow should be <= max borrow ratio')

      // Rebalance will bring back borrow ratio to min borrow ratio
      await strategy.connect(governor.signer).rebalance()
      range = await strategy.borrowRatioRange()
      borrowRatio = await strategy.currentBorrowRatio()
      expect(borrowRatio).to.eq(range._minBorrowRatio, 'Borrow should be == min borrow ratio')
      expect(borrowRatio).to.lt(range._maxBorrowRatio, 'Borrow should be < max borrow ratio')
    })

    it('Should update borrow limits', async function () {
      await deposit(pool, collateralToken, 100, user2)
      await strategy.connect(governor.signer).rebalance()
      await advanceBlock(100)
      const borrowRatioBefore = await strategy.currentBorrowRatio()
      await strategy.connect(governor.signer).updateBorrowLimit(7500, 8200)
      const newMinBorrowLimit = await strategy.minBorrowLimit()
      const minBorrowRatio = (await strategy.borrowRatioRange())._minBorrowRatio
      await strategy.connect(governor.signer).rebalance()
      await token.exchangeRateCurrent()
      const borrowRatioAfter = await strategy.currentBorrowRatio()
      expect(borrowRatioAfter).to.gt(borrowRatioBefore, 'Borrow ratio after should be greater')
      expect(borrowRatioAfter).to.eq(minBorrowRatio, 'Borrow should be >= min borrow ratio')
      expect(newMinBorrowLimit).to.eq(7500, 'Min borrow limit is wrong')

      let tx = strategy.connect(governor.signer).updateBorrowLimit(7500, 10001)
      await expect(tx).to.revertedWith('invalid-max-borrow-limit')

      tx = strategy.connect(governor.signer).updateBorrowLimit(7500, 7000)
      await expect(tx).to.revertedWith('max-should-be-higher-than-min')
    })

    // TODO write loss making test
    // it('Should rebalance when loss making', async function () {
    //   await deposit(pool, collateralToken, 50, user2)
    //   await strategy.connect(governor.signer).rebalance()
    //   const borrowBalance = await token.callStatic.borrowBalanceCurrent(strategy.address)
    //   expect(borrowBalance).to.gt(0, 'Borrow balance should be > 0')

    //   // Advance some blocks to generate interest on borrow
    //   await advanceBlock(10)
    //   expect(await strategy.callStatic.isLossMaking()).to.true
    //   // Even though it is loss making strategy, let rebalance work
    //   await strategy.connect(governor.signer).rebalance()
    // })

    it('Should repay borrow if borrow limit set to 0', async function () {
      await deposit(pool, collateralToken, 100, user1)
      await strategy.connect(governor.signer).rebalance()
      const borrowBefore = await token.callStatic.borrowBalanceCurrent(strategy.address)
      expect(borrowBefore).to.gt(0, 'Borrow amount should be > 0')
      await strategy.connect(governor.signer).updateBorrowLimit(0, 8000)
      await strategy.connect(governor.signer).rebalance()
      const borrowAfter = await token.callStatic.borrowBalanceCurrent(strategy.address)
      expect(borrowAfter).to.eq(0, 'Borrow amount should be = 0')
    })


    it('Should get COMP token as reserve token', async function () {
      expect(await strategy.isReservedToken(compAddress)).to.equal(true, 'COMP token is reserved')
    })

    it('Should claim COMP when rebalance is called', async function () {
      const comptroller = await ethers.getContractAt('Comptroller', comptrollerAddress)
      await deposit(pool, collateralToken, 10, user1)
      await deposit(pool, collateralToken, 2, user2)
      await strategy.connect(governor.signer).rebalance()
      await token.exchangeRateCurrent()
      await advanceBlock(100)

      const withdrawAmount = await pool.balanceOf(user2.address)
      // compAccrued is updated only when user do some activity. withdraw to trigger compAccrue update
      await pool.connect(user2.signer).withdraw(withdrawAmount)
      const compAccruedBefore = await comptroller.compAccrued(strategy.address)
      expect(compAccruedBefore).to.gt(0, 'comp accrued should be > 0 before rebalance')
      await strategy.connect(governor.signer).rebalance()
      const compAccruedAfter = await comptroller.compAccrued(strategy.address)
      expect(compAccruedAfter).to.equal(0, 'comp accrued should be 0 after rebalance')
    })

    it('Should liquidate COMP when claimed by external source', async function () {
      await strategy.connect(governor.signer).updateSwapSlippage('1000')
      const comptroller = await ethers.getContractAt('Comptroller', comptrollerAddress)
      const comp = await ethers.getContractAt('ERC20', compAddress)
      await deposit(pool, collateralToken, 10, user2)
      await strategy.connect(governor.signer).rebalance()
      await advanceBlock(100)
      await comptroller.connect(user2.signer).claimComp(strategy.address, [token.address])
      const afterClaim = await comp.balanceOf(strategy.address)
      expect(afterClaim).to.gt('0', 'COMP balance should be > 0')
      await token.exchangeRateCurrent()
      await strategy.connect(governor.signer).rebalance()
      const compBalance = await comp.balanceOf(strategy.address)
      expect(compBalance).to.equal('0', 'COMP balance should be 0 on rebalance')
    })

    it('Should calculate current totalValue', async function () {
      await deposit(pool, collateralToken, 10, user1)
      await strategy.connect(governor.signer).rebalance()
      await advanceBlock(100)
      const totalValue = await strategy.callStatic.totalValueCurrent()
      const totalDebt = await pool.totalDebt()
      expect(totalValue).to.gt(totalDebt, 'loss making strategy')
    })

    it('Should calculate totalValue', async function () {
      await deposit(pool, collateralToken, 10, user1)
      await strategy.connect(governor.signer).rebalance()
      await advanceBlock(100)
      const totalValue = await strategy.totalValue()
      expect(totalValue).to.gt(0, 'loss making strategy')
    })

    it('Should calculate APY', async function () {
      /* eslint-disable no-console */
      await deposit(pool, collateralToken, 10, user1)
      let blockNumberStart = (await ethers.provider.getBlock()).number
      console.log('\n1st rebalance to supply and borrow')
      let minBorrowLimit = await strategy.minBorrowLimit()
      console.log('Borrowing upto', minBorrowLimit.mul(75).div(100).toNumber() / 100, '% of collateral')
      await strategy.connect(governor.signer).rebalance()
      console.log('Mining 100 blocks')
      await advanceBlock(100)
      console.log('Another Rebalance')
      await strategy.connect(governor.signer).rebalance()
      let pricePerShare = await pool.pricePerShare()
      let blockNumberEnd = (await ethers.provider.getBlock()).number
      let blockElapsed = blockNumberEnd - blockNumberStart
      console.log('APY for ETH::', calculateAPY(pricePerShare, blockElapsed))

      console.log('\nUpdating borrow limit and calculating APY again')
      await strategy.connect(governor.signer).updateBorrowLimit(9000, 9500)
      blockNumberStart = (await ethers.provider.getBlock()).number
      minBorrowLimit = await strategy.minBorrowLimit()
      console.log('Borrowing upto', minBorrowLimit.mul(75).div(100).toNumber() / 100, '% of collateral')
      await strategy.connect(governor.signer).rebalance()
      console.log('Mining 100 blocks')
      await advanceBlock(100)
      await strategy.connect(governor.signer).rebalance()
      pricePerShare = await pool.pricePerShare()
      blockNumberEnd = (await ethers.provider.getBlock()).number
      blockElapsed = blockNumberEnd - blockNumberStart
      console.log('APY for ETH::', calculateAPY(pricePerShare, blockElapsed))
      /* eslint-enable no-console */
    })
  })
}
module.exports = { shouldBehaveLikeCompoundLeverageStrategy }