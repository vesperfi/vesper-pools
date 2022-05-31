'use strict'

const { expect } = require('chai')
const { ethers } = require('hardhat')
const { getStrategyToken, getUsers } = require('../utils/setupHelper')
const { deposit } = require('../utils/poolOps')
const { advanceBlock } = require('../utils/time')
const { adjustBalance } = require('../utils/balance')
const { calculateAPY } = require('../utils/apy')
const { BigNumber } = require('ethers')

// Read addresses of Compound in Address object
const {
  address: { Compound: Address },
} = require('../utils/chains').getChainData()

// Compound XY strategy specific tests
function shouldBehaveLikeCompoundXYStrategy(strategyIndex) {
  let strategy, pool, collateralToken, supplyCToken, comptroller, oracle, borrowTokenPrice, supplyTokenPrice
  let borrowToken, borrowCToken
  let governor, user1, user2
  let DECIMAL18 = ethers.utils.parseUnits('1')
  const maxBps = BigNumber.from('10000')
  async function assertCurrentBorrow() {
    const borrowed = await borrowCToken.borrowBalanceStored(strategy.address)
    borrowTokenPrice = await oracle.getUnderlyingPrice(borrowCToken.address)
    supplyTokenPrice = await oracle.getUnderlyingPrice(supplyCToken.address)
    const collateralSupplied = (await supplyCToken.balanceOf(strategy.address))
      .mul(await supplyCToken.exchangeRateStored())
      .div(DECIMAL18)
    const cf = (await comptroller.markets(supplyCToken.address)).collateralFactorMantissa
    const maxBorrowPossible = collateralSupplied.mul(cf).div(DECIMAL18).mul(supplyTokenPrice).div(borrowTokenPrice)
    const borrowUpperBound = maxBorrowPossible.mul(await strategy.maxBorrowLimit()).div(maxBps)
    const borrowLowerBound = maxBorrowPossible.mul(await strategy.minBorrowLimit()).div(maxBps)
    expect(borrowed).to.be.lt(borrowUpperBound, 'Borrow more than max limit')
    expect(borrowed).to.be.closeTo(
      borrowLowerBound,
      borrowLowerBound.mul(1).div(100),
      'borrowed is too much deviated from minBorrowLimit',
    )
  }

  describe('CompoundXYStrategy specific tests', function () {
    beforeEach(async function () {
      const users = await getUsers()
      ;[governor, user1, user2] = users
      pool = this.pool
      strategy = this.strategies[strategyIndex].instance
      collateralToken = this.collateralToken
      supplyCToken = await getStrategyToken(this.strategies[strategyIndex])
      borrowCToken = await ethers.getContractAt('CToken', await strategy.borrowCToken())
      borrowToken = await ethers.getContractAt('IERC20Metadata', await strategy.borrowToken())
      comptroller = await ethers.getContractAt('Comptroller', await strategy.comptroller())
      oracle = await ethers.getContractAt('Oracle', await comptroller.oracle())
      borrowTokenPrice = await oracle.getUnderlyingPrice(borrowCToken.address)
      supplyTokenPrice = await oracle.getUnderlyingPrice(supplyCToken.address)
      DECIMAL18 = ethers.utils.parseUnits('1', 18)
    })

    context('Borrow tests', function () {
      it('Should borrow tokens at rebalance', async function () {
        await deposit(pool, collateralToken, 10, user1)
        await strategy.connect(governor.signer).rebalance()
        const cTokenBalance = await supplyCToken.balanceOf(strategy.address)
        const borrow = await borrowToken.balanceOf(strategy.address)
        const currentBorrow = await borrowCToken.callStatic.borrowBalanceCurrent(strategy.address)
        expect(cTokenBalance).to.be.gt('0', 'Supply CToken balance should be > 0')
        expect(borrow).to.be.gt('0', 'Borrow token balance should be > 0')
        expect(currentBorrow).to.be.gte(borrow, 'Current borrow should be >= borrow balance')
      })

      it('Should borrow within defined limits', async function () {
        await deposit(pool, collateralToken, 10, user2)
        await strategy.connect(governor.signer).rebalance()
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
        const borrowBefore = await borrowToken.balanceOf(strategy.address)

        const withdrawAmount = (await pool.balanceOf(user1.address)).div('2')
        await pool.connect(user1.signer).withdraw(withdrawAmount)

        await supplyCToken.exchangeRateCurrent()
        await borrowCToken.exchangeRateCurrent()
        const borrowAfter = await borrowToken.balanceOf(strategy.address)
        expect(borrowAfter).to.be.lt(borrowBefore, 'Borrow amount after withdraw should be less')
        await assertCurrentBorrow()
      })
    })

    context('Governor function', function () {
      it('Should repayAll and reset minBorrowRatio via governor', async function () {
        await deposit(pool, collateralToken, 50, user2)
        await strategy.connect(governor.signer).rebalance()
        let borrowBalance = await borrowToken.balanceOf(strategy.address)
        expect(borrowBalance).to.be.gt(0, 'Borrow token balance should be > 0')

        await strategy.connect(governor.signer).repayAll()

        borrowBalance = await borrowToken.balanceOf(strategy.address)
        expect(borrowBalance).to.be.eq(0, 'Borrow token balance should be = 0')
        const newMaxBorrowLimit = await strategy.maxBorrowLimit()
        expect(newMaxBorrowLimit).to.be.eq(0, 'minBorrowRatio should be 0')
      })
      it('Should update borrow limit', async function () {
        await deposit(pool, collateralToken, 100, user1)
        await strategy.connect(governor.signer).rebalance()
        await advanceBlock(100)
        await strategy.connect(governor.signer).updateBorrowLimit(5000, 6000)
        const newMinBorrowLimit = await strategy.minBorrowLimit()
        await strategy.connect(governor.signer).rebalance()
        expect(newMinBorrowLimit).to.be.eq(5000, 'Min borrow limit is wrong')
        await assertCurrentBorrow()
        let tx = strategy.connect(governor.signer).updateBorrowLimit(5000, ethers.constants.MaxUint256)
        await expect(tx).to.be.revertedWith('invalid-max-borrow-limit')

        tx = strategy.connect(governor.signer).updateBorrowLimit(5500, 5000)
        await expect(tx).to.be.revertedWith('max-should-be-higher-than-min')
      })

      it('Should repay borrow if borrow ratio set to 0', async function () {
        await deposit(pool, collateralToken, 100, user1)
        await strategy.connect(governor.signer).rebalance()
        const borrowBefore = await borrowToken.balanceOf(strategy.address)
        expect(borrowBefore).to.be.gt(0, 'Borrow amount should be > 0')
        await strategy.connect(governor.signer).updateBorrowLimit(0, 0)
        await strategy.connect(governor.signer).rebalance()
        const borrowAfter = await borrowToken.balanceOf(strategy.address)
        expect(borrowAfter).to.be.eq(0, 'Borrow amount should be = 0')
      })
      it('Should recover extra borrow tokens', async function () {
        // using swap slippage for realistic scenario
        await strategy.connect(governor.signer).updateSwapSlippage('1000')
        await deposit(pool, collateralToken, 10, user1)
        await strategy.connect(governor.signer).rebalance()
        const tokensHere = await pool.tokensHere()
        const borrowBalance = await borrowToken.balanceOf(strategy.address)
        await adjustBalance(borrowToken.address, strategy.address, borrowBalance.mul(11).div(10))
        const updatedBorrowBalance = await borrowToken.balanceOf(strategy.address)
        expect(updatedBorrowBalance).to.gt(borrowBalance, 'Borrow balance should increase')
        await strategy.connect(governor.signer).recoverBorrowToken(0)
        const newTokensHere = await pool.tokensHere()
        expect(newTokensHere).to.gt(tokensHere, 'Recover borrow token failed')
      })
    })

    // eslint-disable-next-line mocha/no-async-describe
    context('COMP rewards', async function () {
      if ((await strategy.NAME()).includes('IronBankXYStrategy')) {
        // eslint-disable-next-line no-console
        console.log('Skipping COMP related tests as they are not relevant')
        return
      }
      it('Should get COMP token as reserve token', async function () {
        expect(await strategy.isReservedToken(Address.COMP)).to.be.equal(true, 'COMP token is reserved')
      })

      it('Should claim COMP when rebalance is called', async function () {
        await deposit(pool, collateralToken, 10, user1)
        await deposit(pool, collateralToken, 2, user2)
        await strategy.connect(governor.signer).rebalance()
        await supplyCToken.exchangeRateCurrent()
        await advanceBlock(100)

        const withdrawAmount = await pool.balanceOf(user2.address)
        // compAccrued is updated only when user do some activity. withdraw to trigger compAccrue update
        await pool.connect(user2.signer).withdraw(withdrawAmount)
        const compAccruedBefore = await comptroller.compAccrued(strategy.address)
        expect(compAccruedBefore).to.be.gt(0, 'comp accrued should be > 0 before rebalance')
        await strategy.connect(governor.signer).rebalance()
        const compAccruedAfter = await comptroller.compAccrued(strategy.address)
        expect(compAccruedAfter).to.be.equal(0, 'comp accrued should be 0 after rebalance')
      })

      it('Should liquidate COMP when claimed by external source', async function () {
        const comp = await ethers.getContractAt('ERC20', Address.COMP)
        await deposit(pool, collateralToken, 10, user2)
        await strategy.connect(governor.signer).rebalance()
        await advanceBlock(100)
        await comptroller.connect(user2.signer).claimComp(strategy.address, [supplyCToken.address])
        const afterClaim = await comp.balanceOf(strategy.address)
        expect(afterClaim).to.be.gt('0', 'COMP balance should be > 0')
        await supplyCToken.exchangeRateCurrent()
        await strategy.connect(governor.signer).rebalance()
        const compBalance = await comp.balanceOf(strategy.address)
        expect(compBalance).to.be.equal('0', 'COMP balance should be 0 on rebalance')
      })
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
        let pricePerShare = await pool.pricePerShare()
        let blockNumberEnd = (await ethers.provider.getBlock()).number
        let blockElapsed = blockNumberEnd - blockNumberStart
        console.log(`\nAPY for ${XY}::`, calculateAPY(pricePerShare, blockElapsed))
        console.log('Calculating APY again over 100 more blocks')
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
module.exports = { shouldBehaveLikeCompoundXYStrategy }
