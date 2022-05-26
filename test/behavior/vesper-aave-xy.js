'use strict'

const { expect } = require('chai')
const { ethers } = require('hardhat')
const { getUsers } = require('../utils/setupHelper')
const { deposit, rebalanceStrategy } = require('../utils/poolOps')
const { advanceBlock } = require('../utils/time')
const { BigNumber } = require('ethers')
// Read addresses of Compound in Address object
const {
  address: { Aave: Address },
} = require('../utils/chains').getChainData()
// VesperAaveXY strategy specific tests
function shouldBehaveLikeVesperAaveXYStrategy(strategyIndex) {
  let strategy, pool, collateralToken, borrowToken, vdToken
  let governor, user1, user2
  const maxBps = BigNumber.from('10000')
  async function assertCurrentBorrow() {
    const aaveAddressProvider = await ethers.getContractAt('AaveLendingPoolAddressesProvider', Address.AddressProvider)
    const aaveLendingPool = await ethers.getContractAt('AaveLendingPool', await strategy.aaveLendingPool())
    const aaveOracle = await ethers.getContractAt('AaveOracle', await aaveAddressProvider.getPriceOracle())
    const strategyAccountData = await aaveLendingPool.getUserAccountData(strategy.address)
    const borrowTokenPrice = await aaveOracle.getAssetPrice(borrowToken)
    const borrowTokenDecimal = await (await ethers.getContractAt('ERC20', borrowToken)).decimals()
    const maxBorrowPossibleETH = strategyAccountData.totalDebtETH.add(strategyAccountData.availableBorrowsETH)
    const maxBorrowPossibleInBorrowToken = maxBorrowPossibleETH
      .mul(ethers.utils.parseUnits('1', borrowTokenDecimal))
      .div(borrowTokenPrice)
    const borrowUpperBound = maxBorrowPossibleInBorrowToken.mul(await strategy.maxBorrowLimit()).div(maxBps)
    const borrowLowerBound = maxBorrowPossibleInBorrowToken.mul(await strategy.minBorrowLimit()).div(maxBps)
    const borrowed = await vdToken.balanceOf(strategy.address)
    expect(borrowed).to.be.lt(borrowUpperBound, 'Borrow more than max limit')
    expect(borrowed).to.be.closeTo(
      borrowLowerBound,
      borrowLowerBound.mul(1).div(1000),
      'borrowed is too much deviated from minBorrowLimit',
    )
    return strategyAccountData
  }
  describe('VesperAaveXYStrategy specific tests', function () {
    beforeEach(async function () {
      const users = await getUsers()
      ;[governor, user1, user2] = users
      pool = this.pool
      strategy = this.strategies[strategyIndex].instance
      collateralToken = this.collateralToken
      vdToken = await ethers.getContractAt('TokenLike', await strategy.vdToken())
      borrowToken = await strategy.borrowToken()
    })

    it('Should borrow collateral at rebalance', async function () {
      await deposit(pool, collateralToken, 10, user1)
      await strategy.connect(governor.signer).rebalance()
      await assertCurrentBorrow()
    })

    it('Should borrow within defined limits', async function () {
      await deposit(pool, collateralToken, 100, user2)
      await strategy.connect(governor.signer).rebalance()
      await strategy.connect(governor.signer).rebalance()
      await assertCurrentBorrow()
    })

    it('Should adjust borrow to keep it within defined limits', async function () {
      await deposit(pool, collateralToken, 100, user1)
      await strategy.connect(governor.signer).rebalance()
      const accountDataBefore = await assertCurrentBorrow()
      await advanceBlock(100)
      // Withdraw will payback borrow
      const withdrawAmount = (await pool.balanceOf(user1.address)).div('3')
      await pool.connect(user1.signer).withdraw(withdrawAmount)
      const accountDataAfter = await assertCurrentBorrow()
      expect(accountDataAfter.totalDebtETH).to.be.lt(accountDataBefore.totalDebtETH, 'Borrowed not is not correct')
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

    it('Should repay and borrow more based on updated borrow limit', async function () {
      await deposit(pool, collateralToken, 100, user1)
      await strategy.connect(governor.signer).rebalance()
      await advanceBlock(100)
      await strategy.connect(governor.signer).updateBorrowLimit(8000, 9000)
      await strategy.connect(governor.signer).rebalance()
      let accountDataBefore = await assertCurrentBorrow()
      await strategy.connect(governor.signer).updateBorrowLimit(6000, 7000)
      await strategy.connect(governor.signer).rebalance()
      let accountDataAfter = await assertCurrentBorrow()
      expect(accountDataAfter.totalDebtETH).to.be.lt(accountDataBefore.totalDebtETH, 'Borrowed is not correct')
      await strategy.connect(governor.signer).updateBorrowLimit(8000, 9000)
      await strategy.connect(governor.signer).rebalance()
      accountDataBefore = accountDataAfter
      accountDataAfter = await assertCurrentBorrow()
      expect(accountDataAfter.totalDebtETH).to.be.gt(accountDataBefore.totalDebtETH, 'Borrowed is not correct')
    })
  })
}
module.exports = { shouldBehaveLikeVesperAaveXYStrategy }
