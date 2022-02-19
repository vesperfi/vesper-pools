'use strict'

const { expect } = require('chai')
const { ethers } = require('hardhat')
const { getUsers } = require('../utils/setupHelper')
const { deposit } = require('../utils/poolOps')
const { advanceBlock } = require('../utils/time')
const { getChain } = require('../utils/chains')

// Compound Leverage strategy specific tests
function shouldBehaveLikeCompoundLeverageStrategy(strategyIndex) {
  let strategy, pool, collateralToken, collateralDecimal, token
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

  describe('CompoundLeverageStrategy specific tests', function () {
    beforeEach(async function () {
      const users = await getUsers()
      ;[governor, user1, user2] = users
      pool = this.pool
      strategy = this.strategies[strategyIndex].instance
      collateralToken = this.collateralToken
      collateralDecimal = await this.collateralToken.decimals()
      token = this.strategies[strategyIndex].token
    })

    it('Should work as expected when debtRatio is 0', async function () {
      // Skipping this for Avalanche as it seems to fail randomly against a fixed block number
      // TODO: Debug and fix this test case for Avalanche
      if (getChain() !== 'avalanche') {
        await deposit(pool, collateralToken, 2, user1)
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

        await strategy.connect(governor.signer).rebalance()
        position = await strategy.getPosition()
        expect(position._supply).to.eq(0, 'Incorrect supply')
        expect(position._borrow).to.eq(0, 'Incorrect borrow')
        expect(await pool.totalDebtOf(strategy.address)).to.eq(0, 'Incorrect total debt of strategy')
      }
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

      await token.exchangeRateCurrent()
      const collateralBefore = await token.callStatic.balanceOfUnderlying(strategy.address)

      // Withdraw will increase borrow ratio.
      const withdrawAmount = (await pool.balanceOf(user1.address)).div('3')
      await pool.connect(user1.signer).withdraw(withdrawAmount)

      await token.exchangeRateCurrent()
      const collateralAfter = await token.callStatic.balanceOfUnderlying(strategy.address)
      const minBorrowRatio = await strategy.minBorrowRatio()
      const maxBorrowRatio = await strategy.maxBorrowRatio()
      let borrowRatio = await strategy.currentBorrowRatio()
      expect(borrowRatio).to.gt(minBorrowRatio, 'Borrow should be > min borrow ratio')
      expect(borrowRatio).to.lte(maxBorrowRatio, 'Borrow should be <= max borrow ratio')

      expect(collateralAfter).to.lt(collateralBefore, 'Borrow amount after withdraw should be less')

      // Rebalance will bring back borrow ratio to min borrow ratio
      await strategy.connect(governor.signer).rebalance()
      borrowRatio = await strategy.currentBorrowRatio()
      expect(borrowRatio).to.eq(minBorrowRatio, 'Borrow should be == min borrow ratio')
      expect(borrowRatio).to.lt(maxBorrowRatio, 'Borrow should be < max borrow ratio')
    })

    it('Should verify that Aave flash loan works', async function () {
      await strategy.connect(governor.signer).updateDyDxStatus(false)
      await strategy.connect(governor.signer).updateAaveStatus(true)
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

      // Rebalance will bring back borrow ratio to min borrow ratio
      await strategy.connect(governor.signer).rebalance()
      borrowRatio = await strategy.currentBorrowRatio()
      // Due to Aave flash loan fee borrow ration will be higher than min
      expect(borrowRatio).to.gt(minBorrowRatio, 'Borrow should be > min borrow ratio')
      expect(borrowRatio).to.lt(maxBorrowRatio, 'Borrow should be < max borrow ratio')
    })

    it('Should verify that DyDx flash loan works', async function () {
      if (getChain() !== 'avalanche') {
        await strategy.connect(governor.signer).updateDyDxStatus(true)
        await strategy.connect(governor.signer).updateAaveStatus(false)
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

        // Rebalance will bring back borrow ratio to min borrow ratio
        await strategy.connect(governor.signer).rebalance()
        borrowRatio = await strategy.currentBorrowRatio()
        expect(borrowRatio).to.eq(minBorrowRatio, 'Borrow should be == min borrow ratio')
        expect(borrowRatio).to.lt(maxBorrowRatio, 'Borrow should be < max borrow ratio')
      }
    })

    it('Should update borrow ratio', async function () {
      await deposit(pool, collateralToken, 100, user2)
      await strategy.connect(governor.signer).rebalance()
      await advanceBlock(100)
      const borrowRatioBefore = await strategy.currentBorrowRatio()
      await strategy.connect(governor.signer).updateBorrowRatio(5100, 5500)
      const newMinBorrowRatio = await strategy.minBorrowRatio()
      expect(newMinBorrowRatio).to.eq(5100, 'Min borrow limit is wrong')

      await strategy.connect(governor.signer).rebalance()
      await token.exchangeRateCurrent()
      const borrowRatioAfter = await strategy.currentBorrowRatio()
      expect(borrowRatioAfter).to.gt(borrowRatioBefore, 'Borrow ratio after should be greater')
      expect(borrowRatioAfter).to.eq(newMinBorrowRatio, 'Borrow should be >= min borrow ratio')

      let tx = strategy.connect(governor.signer).updateBorrowRatio(5500, 9500)
      await expect(tx).to.revertedWith('invalid-max-borrow-limit')

      tx = strategy.connect(governor.signer).updateBorrowRatio(5500, 5000)
      await expect(tx).to.revertedWith('max-should-be-higher-than-min')
    })

    it('Should repay borrow if borrow limit set to 0', async function () {
      // Skipping this for Avalanche as it seems to fail randomly against a fixed block number
      // TODO: Debug and fix this test case for Avalanche
      if (getChain() !== 'avalanche') {
        await deposit(pool, collateralToken, 100, user1)
        await strategy.connect(governor.signer).rebalance()
        const borrowBefore = await token.callStatic.borrowBalanceCurrent(strategy.address)
        expect(borrowBefore).to.gt(0, 'Borrow amount should be > 0')
        await strategy.connect(governor.signer).updateBorrowRatio(0, 5500)
        await strategy.connect(governor.signer).rebalance()
        const borrowAfter = await token.callStatic.borrowBalanceCurrent(strategy.address)
        expect(borrowAfter).to.eq(0, 'Borrow amount should be = 0')
      }
    })

    it('Should get rewardToken token as reserve token', async function () {
      expect(await strategy.isReservedToken(await strategy.rewardToken())).to.equal(true, 'rewardToken is reserved')
    })

    it('Should claim rewardToken when rebalance is called', async function () {
      async function rewardAccrued() {
        if (getChain() === 'mainnet') {
          const comptroller = await ethers.getContractAt('Comptroller', await strategy.comptroller())
          return comptroller.compAccrued(strategy.address)
        }
        // avalanche
        const rewardDistributor = await ethers.getContractAt('IRewardDistributor', await strategy.rewardDistributor())
        return rewardDistributor.rewardAccrued(0, strategy.address)
      }

      await deposit(pool, collateralToken, 10, user1)
      await deposit(pool, collateralToken, 2, user2)
      await strategy.connect(governor.signer).rebalance()
      await token.exchangeRateCurrent()
      await advanceBlock(100)

      const withdrawAmount = await pool.balanceOf(user2.address)
      // reward accrued is updated only when user do some activity.
      // withdraw to trigger reward accrued update

      await pool.connect(user2.signer).withdraw(withdrawAmount)
      const rewardAccruedBefore = await rewardAccrued()
      expect(rewardAccruedBefore).to.gt(0, 'reward accrued should be > 0 before rebalance')
      await strategy.connect(governor.signer).rebalance()
      const rewardAccruedAfter = await rewardAccrued()
      expect(rewardAccruedAfter).to.equal(0, 'reward accrued should be 0 after rebalance')
    })

    it('Should liquidate rewardToken when claimed by external source', async function () {
      await strategy.connect(governor.signer).updateSwapSlippage('1000')
      const comptroller = await strategy.comptroller()
      const rewardToken = await ethers.getContractAt('IERC20', strategy.rewardToken())
      await deposit(pool, collateralToken, 10, user2)
      await strategy.connect(governor.signer).rebalance()
      await advanceBlock(100)
      if (getChain() === 'mainnet') {
        const comptrollerInstance = await ethers.getContractAt('Comptroller', comptroller)
        await comptrollerInstance.connect(user2.signer).claimComp(strategy.address, [token.address])
      } else {
        // avalanche case
        const comptrollerInstance = await ethers.getContractAt('ComptrollerMultiReward', comptroller)
        await comptrollerInstance.connect(user2.signer).claimReward(0, strategy.address)
      }
      const afterClaim = await rewardToken.balanceOf(strategy.address)
      expect(afterClaim).to.gt('0', 'rewardToken balance should be > 0')
      await token.exchangeRateCurrent()
      await strategy.connect(governor.signer).rebalance()
      const rewardTokenBalance = await rewardToken.balanceOf(strategy.address)
      expect(rewardTokenBalance).to.equal('0', 'rewardToken balance should be 0 on rebalance')
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
      await strategy.connect(governor.signer).updateBorrowRatio(5000, 5500)
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
module.exports = { shouldBehaveLikeCompoundLeverageStrategy }
