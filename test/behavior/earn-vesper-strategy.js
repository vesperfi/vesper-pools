'use strict'

const { deposit, timeTravel, rebalanceStrategy } = require('../utils/poolOps')
const { expect } = require('chai')
const { ethers } = require('hardhat')
const { getUsers, getEvent } = require('../utils/setupHelper')
const { getChain } = require('../utils/chains')
const Address = require(`../../helper/${getChain()}/address`)
const { adjustBalance } = require('../utils/balance')
const { unlock } = require('../utils/setupHelper')

const { shouldBehaveLikeUnderlyingVesperPoolStrategy } = require('./strategy-underlying-vesper-pool')
let pool, strategy, accountant, dripTokenSymbol, rewardTokenSymbol, EarnDrip, unlockedStrategy
let collateralToken, rewardToken, dripToken, collateralTokenDecimals, vToken, vspToken
let governor, user1, user2

async function rebalanceAndAssert(isPayback) {
  // Rebalance and assert event first.
  const txnObj = await rebalanceStrategy(strategy)
  const event = await getEvent(txnObj, accountant, 'EarningReported')
  expect(event.loss).to.be.equal(0, 'Should report 0 loss')
  expect(event.profit).to.be.equal(0, 'Should report 0 profit')
  if (isPayback) {
    expect(event.payback).to.be.gt(0, 'Should have some payback')
  } else {
    expect(event.payback).to.be.eq(0, 'Should not have payback')
  }

  // assert price per share remains 1.
  expect(await pool.pricePerShare()).to.be.eq(
    ethers.utils.parseUnits('1', collateralTokenDecimals),
    'price per share changed',
  )
}

async function shouldBehaveLikeEarnVesperStrategy(strategyIndex) {
  shouldBehaveLikeUnderlyingVesperPoolStrategy(strategyIndex)
  describe(`Earn Vesper specific tests for strategy[${strategyIndex}]`, function () {
    beforeEach(async function () {
      ;[user1, user2] = await getUsers()
      ;[governor] = await ethers.getSigners()
      pool = this.pool
      accountant = this.accountant
      strategy = this.strategies[strategyIndex]
      collateralToken = this.collateralToken
      collateralTokenDecimals = await this.collateralToken.decimals()
      dripToken = await ethers.getContractAt('ERC20', await strategy.instance.dripToken())
      vspToken = await ethers.getContractAt('ERC20', await Address.VSP)
      vToken = await ethers.getContractAt('ERC20', await strategy.instance.token())
      dripTokenSymbol = await dripToken.symbol()
      EarnDrip = await ethers.getContractAt('IEarnDrip', await pool.poolRewards())
      rewardToken = await ethers.getContractAt('ERC20', await EarnDrip.growToken())
      if (rewardToken.address === ethers.constants.AddressZero) {
        rewardToken = dripToken
      }
      rewardTokenSymbol = await rewardToken.symbol()
      unlockedStrategy = await unlock(strategy.instance.address)
    })

    describe('Earning scenario', function () {
      beforeEach(async function () {
        await deposit(pool, collateralToken, 20, user1)
        await rebalanceStrategy(strategy)
      })

      it('Should increase drip balance on rebalance', async function () {
        await deposit(pool, collateralToken, 40, user2)
        await rebalanceStrategy(strategy)

        const earnedDripBefore =
          dripToken.address === Address.WETH
            ? await ethers.provider.getBalance(user2.address)
            : await dripToken.balanceOf(user2.address)

        const tokenBalanceBefore = await rewardToken.balanceOf(EarnDrip.address)
        const pricePerShareBefore = await pool.pricePerShare()

        await timeTravel(10 * 24 * 60 * 60)
        await rebalanceStrategy(strategy)

        // Earn drip has custom logic for claimable, so lets test it here
        await EarnDrip.updateReward(user1.address)
        const claimable = await EarnDrip.claimable(user1.address)
        expect(claimable._claimableAmounts[0]).to.gt(0, 'incorrect claimable')

        const tokenBalanceAfter = await rewardToken.balanceOf(EarnDrip.address)
        expect(tokenBalanceAfter).to.be.gt(
          tokenBalanceBefore,
          `Should increase ${rewardTokenSymbol} balance in EarnDrip`,
        )

        const pricePerShareAfter = await pool.pricePerShare()
        expect(pricePerShareBefore).to.be.eq(pricePerShareAfter, "Price per share of of EarnPool shouldn't increase")
        const withdrawAmount = await pool.balanceOf(user2.address)

        if (collateralToken.address === Address.WETH)
          await pool.connect(user2.signer).withdrawETHAndClaim(withdrawAmount)
        else await pool.connect(user2.signer).withdrawAndClaim(withdrawAmount)

        const earnedDrip =
          dripToken.address === Address.WETH
            ? await ethers.provider.getBalance(user2.address)
            : await dripToken.balanceOf(user2.address)

        expect(earnedDrip.sub(earnedDripBefore)).to.be.gt(0, `No ${dripTokenSymbol} earned`)
      })

      it('Should withdraw and drip for profitable case', async function () {
        const rewardTokenBalanceBefore = await rewardToken.balanceOf(EarnDrip.address)
        const vTokenBalBefore = await vToken.balanceOf(strategy.instance.address)

        await rebalanceAndAssert()
        const rewardTokenBalanceAfter = await rewardToken.balanceOf(EarnDrip.address)
        const vTokenBalAfter = await vToken.balanceOf(strategy.instance.address)
        // Ignore assert when drip and reward same token (VSP here)
        if (dripToken.address !== Address.VSP) {
          expect(rewardTokenBalanceAfter).to.gt(rewardTokenBalanceBefore, `${dripTokenSymbol} drip failed`)
          expect(vTokenBalAfter).to.lt(vTokenBalBefore, `${dripTokenSymbol} withdraw failed`)
        }
      })

      it('Should verify that VSP rewards are claimed', async function () {
        // Set VSP reward token
        await adjustBalance(Address.VSP, strategy.instance.address, ethers.utils.parseEther('1000'))
        const vspBalanceBefore = await vspToken.balanceOf(strategy.instance.address)

        await rebalanceAndAssert()
        const vspBalanceAfter = await vspToken.balanceOf(strategy.instance.address)
        expect(vspBalanceAfter).to.lt(vspBalanceBefore, `${dripTokenSymbol} vsp reward claim failed`)
      })

      it('Should withdraw, drip and payback for profitable case', async function () {
        await adjustBalance(
          collateralToken.address,
          strategy.instance.address,
          ethers.utils.parseUnits('1', collateralTokenDecimals),
        )
        const rewardTokenBalanceBefore = await rewardToken.balanceOf(EarnDrip.address)
        const vTokenBalBefore = await vToken.balanceOf(strategy.instance.address)

        // reduce debt ratio to generate payback scenario
        await accountant.connect(governor).updateDebtRatio(strategy.instance.address, 5000)

        await rebalanceAndAssert(true) // payback true
        const rewardTokenBalanceAfter = await rewardToken.balanceOf(EarnDrip.address)
        const vTokenBalAfter = await vToken.balanceOf(strategy.instance.address)
        // Ignore assert when drip and reward same token (VSP here)
        if (dripToken.address !== Address.VSP) {
          expect(rewardTokenBalanceAfter).to.gt(rewardTokenBalanceBefore, `${dripTokenSymbol} drip failed`)
        }
        expect(vTokenBalAfter).to.lt(vTokenBalBefore, `${dripTokenSymbol} withdraw failed`)
      })

      it('Should not withdraw and drip for loss case', async function () {
        const vTokenBalBefore = await vToken.balanceOf(strategy.instance.address)
        const rewardTokenBalanceBefore = await rewardToken.balanceOf(EarnDrip.address)
        // transfer some vToken to a user to create loss scenario
        const transferAmount = vTokenBalBefore.mul(40).div(100)
        vToken.connect(unlockedStrategy).transfer(user2.address, vTokenBalBefore.mul(40).div(100))

        await rebalanceAndAssert() // no payback
        const rewardTokenBalanceAfter = await rewardToken.balanceOf(EarnDrip.address)
        const vTokenBalAfter = await vToken.balanceOf(strategy.instance.address)
        expect(rewardTokenBalanceAfter).to.eq(rewardTokenBalanceBefore, `${dripTokenSymbol} drip failed`)
        expect(vTokenBalAfter.add(transferAmount)).to.eq(vTokenBalBefore, `${dripTokenSymbol} withdraw failed`)
      })

      it('Should validate drip and payback when _collateralHere < profitAndExcessDebt', async function () {
        const vTokenBalBefore = await vToken.balanceOf(strategy.instance.address)
        const rewardTokenBalanceBefore = await rewardToken.balanceOf(EarnDrip.address)
        const amount = [Address.WETH].includes(collateralToken.address) ? '1' : '100'
        const transferAmount = ethers.utils.parseUnits(amount, collateralTokenDecimals)
        vToken.connect(unlockedStrategy).transfer(user2.address, transferAmount)
        await adjustBalance(collateralToken.address, strategy.instance.address, transferAmount.mul(101).div(100))
        await accountant.connect(governor).updateDebtRatio(strategy.instance.address, 5000)

        await rebalanceAndAssert(true) // payback true
        const rewardTokenBalanceAfter = await rewardToken.balanceOf(EarnDrip.address)
        const vTokenBalAfter = await vToken.balanceOf(strategy.instance.address)
        // Ignore assert when drip and reward same token (VSP here)
        if (dripToken.address !== Address.VSP) {
          expect(rewardTokenBalanceAfter).to.gt(rewardTokenBalanceBefore, `${dripTokenSymbol} drip failed`)
        }
        expect(vTokenBalAfter).to.lt(vTokenBalBefore, 'Wrong vToken balance')
      })

      it('Should validate drip only when _collateralHere < profitAndExcessDebt', async function () {
        const vTokenBalBefore = await vToken.balanceOf(strategy.instance.address)
        const rewardTokenBalanceBefore = await rewardToken.balanceOf(EarnDrip.address)
        const amount = [Address.WETH].includes(collateralToken.address) ? '1' : '100'
        const transferAmount = ethers.utils.parseUnits(amount, collateralTokenDecimals)
        vToken.connect(unlockedStrategy).transfer(user2.address, transferAmount)
        await adjustBalance(collateralToken.address, strategy.instance.address, transferAmount.mul(101).div(100))
        await rebalanceAndAssert(false)
        const rewardTokenBalanceAfter = await rewardToken.balanceOf(EarnDrip.address)
        const vTokenBalAfter = await vToken.balanceOf(strategy.instance.address)
        // Ignore assert when drip and reward same token (VSP here)
        if (dripToken.address !== Address.VSP) {
          expect(rewardTokenBalanceAfter).to.gt(rewardTokenBalanceBefore, `${dripTokenSymbol} drip failed`)
        }
        expect(vTokenBalAfter).to.lt(vTokenBalBefore, 'Wrong vToken balance')
      })

      it('Should not payback when collateral ratio is increased', async function () {
        await accountant.connect(governor).updateDebtRatio(strategy.instance.address, 9500)
        await rebalanceAndAssert() // no payback
      })

      it('Should payback when collateral ratio is decreased', async function () {
        await accountant.connect(governor).updateDebtRatio(strategy.instance.address, 8000)
        await rebalanceAndAssert(true) // payback
      })

      it('Should retire strategy', async function () {
        await deposit(pool, collateralToken, 100, user2)
        await rebalanceStrategy(strategy)
        await timeTravel(30 * 24 * 60 * 60)

        await accountant.connect(governor).updateDebtRatio(strategy.instance.address, 0)
        await rebalanceAndAssert(true) // payback true
        const vTokenBal = await vToken.balanceOf(strategy.instance.address)
        const collateralTokenBal = await collateralToken.balanceOf(strategy.instance.address)

        // WBTC leave big dust on retiring strategy.
        const dust = [Address.WBTC].includes(collateralToken.address) ? '100000000000' : '10'
        expect(vTokenBal).to.lte(dust, 'vToken balance more than dust')
        expect(collateralTokenBal).to.lte(dust, 'collateral balance more than dust')
      })
    })
  })
}

module.exports = { shouldBehaveLikeEarnVesperStrategy }
