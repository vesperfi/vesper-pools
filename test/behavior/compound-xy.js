'use strict'

const { expect } = require('chai')
const { ethers } = require('hardhat')
const { getUsers } = require('../utils/setupHelper')
const { deposit } = require('../utils/poolOps')
const { advanceBlock } = require('../utils/time')
const { adjustBalance } = require('../utils/balance')

const cUNIAddress = '0x35A18000230DA775CAc24873d00Ff85BccdeD550'
const cAAVEAddress = '0xe65cdB6479BaC1e22340E4E755fAE7E509EcD06c'
const comptrollerAddress = '0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B'
const compAddress = '0xc00e94Cb662C3520282E6f5717214004A7f26888'

// Compound XY strategy specific tests
function shouldBehaveLikeCompoundXYStrategy(strategyIndex) {
  let strategy, pool, collateralToken, token
  let borrowToken, borrowCToken
  let governor, user1, user2


  function calculateAPY(pricePerShare, blockElapsed) {
    // APY calculation
    const ETHER = ethers.utils.parseEther('1')
    const ONE_YEAR = 60 * 60 * 24 * 365
    const APY = pricePerShare.sub(ETHER).mul(ONE_YEAR).mul('100').div(blockElapsed * 14)
    const apyInBasisPoints = APY.mul(100).div(ETHER).toNumber()
    return apyInBasisPoints / 100
  }

  describe('CompoundXYStrategy specific tests', function () {
    beforeEach(async function () {
      const users = await getUsers()
        ;[governor, user1, user2] = users
      pool = this.pool
      strategy = this.strategies[strategyIndex].instance
      collateralToken = this.collateralToken
      token = this.strategies[strategyIndex].token
      borrowCToken = await ethers.getContractAt('CToken', await strategy.borrowCToken())
      borrowToken = await ethers.getContractAt('ERC20', await strategy.borrowToken())
    })

    it('Should borrow tokens at rebalance', async function () {
      await deposit(pool, collateralToken, 10, user1)
      await strategy.connect(governor.signer).rebalance()
      const cTokenBalance = await token.balanceOf(strategy.address)
      const borrow = await borrowToken.balanceOf(strategy.address)
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
      const borrowBefore = await borrowToken.balanceOf(strategy.address)

      const withdrawAmount = (await pool.balanceOf(user1.address)).div('2')
      await pool.connect(user1.signer).withdraw(withdrawAmount)

      await token.exchangeRateCurrent()
      await borrowCToken.exchangeRateCurrent()
      const borrowAfter = await borrowToken.balanceOf(strategy.address)

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
      let borrowBalance = await borrowToken.balanceOf(strategy.address)
      expect(borrowBalance).to.be.gt(0, 'Borrow token balance should be > 0')

      await strategy.connect(governor.signer).repayAll()

      borrowBalance = await borrowToken.balanceOf(strategy.address)
      expect(borrowBalance).to.be.eq(0, 'Borrow token balance should be = 0')
      const newMinBorrowRatio = await strategy.minBorrowRatio()
      expect(newMinBorrowRatio).to.be.eq(0, 'minBorrowRatio should be 0')
    })

    it('Should update borrow CToken', async function () {
      await deposit(pool, collateralToken, 50, user2)
      await strategy.connect(governor.signer).rebalance()
      let borrowBalance = await borrowToken.balanceOf(strategy.address)
      expect(borrowBalance).to.be.gt(0, 'Borrow balance should be > 0')

      await strategy.connect(governor.signer).updateBorrowCToken(cUNIAddress)
      const newBorrowToken = await ethers.getContractAt('ERC20', await strategy.borrowToken())

      borrowBalance = await borrowToken.balanceOf(strategy.address)
      expect(borrowBalance).to.be.eq(0, 'Old borrow token balance should be = 0')
      const newBorrowBalance = await newBorrowToken.balanceOf(strategy.address)
      expect(newBorrowBalance).to.be.gt(0, 'New borrow token balance should be > 0')
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

    // TODO investigate why this is failing after new compound proposals
    // eslint-disable-next-line mocha/no-skipped-tests
    it.skip('Should rebalance when loss making', async function () {
      await strategy.connect(governor.signer).updateBorrowCToken(cAAVEAddress)
      borrowToken = await ethers.getContractAt('ERC20', await strategy.borrowToken())
      await deposit(pool, collateralToken, 50, user2)
      await strategy.connect(governor.signer).rebalance()
      const borrowBalance = await borrowToken.balanceOf(strategy.address)
      expect(borrowBalance).to.be.gt(0, 'Borrow balance should be > 0')

      // Advance some blocks to generate interest on borrow
      await advanceBlock(10)
      expect(await strategy.callStatic.isLossMaking()).to.be.true
      // Even though it is loss making strategy, let rebalance work
      await strategy.connect(governor.signer).rebalance()
    })

    it('Should repay borrow if borrow ratio set to 0', async function () {
      await deposit(pool, collateralToken, 100, user1)
      await strategy.connect(governor.signer).rebalance()
      const borrowBefore = await borrowToken.balanceOf(strategy.address)
      expect(borrowBefore).to.be.gt(0, 'Borrow amount should be > 0')
      await strategy.connect(governor.signer).updateBorrowRatio(0, 7000)
      await strategy.connect(governor.signer).rebalance()
      const borrowAfter = await borrowToken.balanceOf(strategy.address)
      expect(borrowAfter).to.be.eq(0, 'Borrow amount should be = 0')
    })


    it('Should get COMP token as reserve token', async function () {
      expect(await strategy.isReservedToken(compAddress)).to.be.equal(true, 'COMP token is reserved')
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
      expect(compAccruedBefore).to.be.gt(0, 'comp accrued should be > 0 before rebalance')
      await strategy.connect(governor.signer).rebalance()
      const compAccruedAfter = await comptroller.compAccrued(strategy.address)
      expect(compAccruedAfter).to.be.equal(0, 'comp accrued should be 0 after rebalance')
    })

    it('Should liquidate COMP when claimed by external source', async function () {
      const comptroller = await ethers.getContractAt('Comptroller', comptrollerAddress)
      const comp = await ethers.getContractAt('ERC20', compAddress)
      await deposit(pool, collateralToken, 10, user2)
      await strategy.connect(governor.signer).rebalance()
      await advanceBlock(100)
      await comptroller.connect(user2.signer).claimComp(strategy.address, [token.address])
      const afterClaim = await comp.balanceOf(strategy.address)
      expect(afterClaim).to.be.gt('0', 'COMP balance should be > 0')
      await token.exchangeRateCurrent()
      await strategy.connect(governor.signer).rebalance()
      const compBalance = await comp.balanceOf(strategy.address)
      expect(compBalance).to.be.equal('0', 'COMP balance should be 0 on rebalance')
    })

    it('Should calculate current totalValue', async function () {
      await deposit(pool, collateralToken, 10, user1)
      await strategy.connect(governor.signer).rebalance()
      await advanceBlock(100)
      const totalValue = await strategy.callStatic.totalValueCurrent()
      const totalDebt = await pool.totalDebt()
      expect(totalValue).to.be.gt(totalDebt, 'loss making strategy')
    })

    it('Should calculate totalValue', async function () {
      await deposit(pool, collateralToken, 10, user1)
      await strategy.connect(governor.signer).rebalance()
      await advanceBlock(100)
      const totalValue = await strategy.totalValue()
      expect(totalValue).to.be.gt(0, 'loss making strategy')
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

    it('Should calculate APY', async function () {
      /* eslint-disable no-console */
      await deposit(pool, collateralToken, 10, user1)
      let blockNumberStart = (await ethers.provider.getBlock()).number
      await strategy.connect(governor.signer).rebalance()
      await advanceBlock(100)
      await strategy.connect(governor.signer).rebalance()
      let pricePerShare = await pool.pricePerShare()
      let blockNumberEnd = (await ethers.provider.getBlock()).number
      let blockElapsed = blockNumberEnd - blockNumberStart
      console.log('\nAPY for WBTC::', calculateAPY(pricePerShare, blockElapsed))
      console.log('\nUpdating borrow token to UNI')
      await strategy.connect(governor.signer).updateBorrowCToken(cUNIAddress)
      blockNumberStart = (await ethers.provider.getBlock()).number
      await strategy.connect(governor.signer).rebalance()

      const isLossMaking = await strategy.callStatic.isLossMaking()
      console.log('Is UNI loss making?', isLossMaking)
      if (!isLossMaking) {
        await advanceBlock(100)
        await strategy.connect(governor.signer).rebalance()
        pricePerShare = await pool.pricePerShare()
        blockNumberEnd = (await ethers.provider.getBlock()).number
        blockElapsed = blockNumberEnd - blockNumberStart
        console.log('APY for UNI::', calculateAPY(pricePerShare, blockElapsed))
      }
      /* eslint-enable no-console */
    })
  })
}
module.exports = { shouldBehaveLikeCompoundXYStrategy }