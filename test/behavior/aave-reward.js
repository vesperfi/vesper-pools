'use strict'

const swapper = require('../utils/tokenSwapper')
const {expect} = require('chai')
const {ethers} = require('hardhat')
const time = require('../utils/time')
const {deposit, rebalanceStrategy} = require('../utils/poolOps')
const AAVE_ADDRESS = '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9'
const STAKED_AAVE_ADDRESS = '0x4da27a545c0c5B758a6BA100e3a049001de870f5'

// Aave reward claim and unstake behavior tests for Aave and AaveMaker strategy
function shouldClaimAaveRewards(strategyIndex) {
  let strategy, aave, stakedAave, pool, collateralToken
  let user1, user2

  async function stakeAave(onBehalfOf, caller) {
    const aaveBalance = await swapper.swapEthForToken(100, AAVE_ADDRESS, caller)
    await aave.connect(caller.signer).approve(STAKED_AAVE_ADDRESS, aaveBalance)
    await stakedAave.connect(caller.signer).stake(onBehalfOf, aaveBalance)
  }

  // TODO Below tests are skipped as Aave rewards are time sensitive and tests are now failing
  // eslint-disable-next-line mocha/no-skipped-tests
  describe.skip('Claim Aave rewards', function () {
    beforeEach(async function () {
      ;[, user1, user2] = this.users
      strategy = this.strategies[strategyIndex]
      aave = await ethers.getContractAt('ERC20', AAVE_ADDRESS)
      stakedAave = await ethers.getContractAt('StakedAave', STAKED_AAVE_ADDRESS)
      pool = this.pool
      collateralToken = this.collateralToken
    })

    describe('Start cooldown', function () {
      it('Should return false for canStartCooldown', async function () {
        const canStartCooldown = await strategy.instance.canStartCooldown()
        expect(canStartCooldown).to.be.false
      })

      it('Should return true for canStartCooldown', async function () {
        await stakeAave(strategy.instance.address, user1)
        const canStartCooldown = await strategy.instance.canStartCooldown()
        expect(canStartCooldown).to.be.true
      })

      it('Should startCooldown', async function () {
        await stakeAave(strategy.instance.address, user1)
        await strategy.instance.startCooldown()
        const data = await strategy.instance.cooldownData()
        expect(data._cooldownStart).to.be.eq(await time.latest(), 'Cooldown start is not correct')
      })
    })

    describe('Unstake StakedAave', function () {
      beforeEach(async function () {
        await stakeAave(strategy.instance.address, user2)
        await strategy.instance.startCooldown()
        // time trave 11 days which take us between cooldown end and unstake end
        await time.increase(11 * 24 * 60 * 60)
      })

      it('Should unstake StakedAave', async function () {
        const stakedAaveBefore = await stakedAave.balanceOf(strategy.instance.address)
        expect(stakedAaveBefore).to.be.gt(0, 'StakedAave balance should be > 0')
        await strategy.instance.unstakeAave()
        const stakedAaveAfter = await stakedAave.balanceOf(strategy.instance.address)
        expect(stakedAaveAfter).to.be.eq(0, 'StakedAave balance should be equal 0')
      })
    })

    describe('claim stkAave and rebalance', function () {
      beforeEach(async function () {
        await deposit(pool, collateralToken, 100, user1)
        await rebalanceStrategy(strategy)
      })

      it('Day 1: Should receive stkAave after rebalance', async function () {
        await rebalanceStrategy(strategy)
        const stkAave = await stakedAave.balanceOf(strategy.instance.address)
        const data = await strategy.instance.cooldownData()
        expect(data._cooldownStart).to.be.eq(await time.latest(), 'Cooldown start is not correct')
        expect(stkAave).to.be.gt(0, 'StakedAave balance should be > 0')
      })

      it('Should not claim stk aave if cool down period started', async function () {
        await rebalanceStrategy(strategy)
        const stkAaveBefore = await stakedAave.balanceOf(strategy.instance.address)
        await time.increase(3 * 60 * 60)
        await rebalanceStrategy(strategy)
        const stkAaveAfter = await stakedAave.balanceOf(strategy.instance.address)
        expect(stkAaveAfter).to.be.eq(stkAaveBefore, 'StakedAave balance should remains same in cool down period')
      })

      it('Should unstake aave if its unstake window', async function () {
        await rebalanceStrategy(strategy)
        await time.increase(11 * 24 * 60 * 60)
        await rebalanceStrategy(strategy)
        const stkAave = await stakedAave.balanceOf(strategy.instance.address)
        expect(stkAave).to.be.eq(0, 'StakedAave balance should be 0')
      })

      it('Should claim more stkAave if unstake window missed', async function () {
        await rebalanceStrategy(strategy)
        await time.increase(11 * 24 * 60 * 60)
        await time.increase(7 * 24 * 60 * 60)
        const stkAaveBefore = await stakedAave.balanceOf(strategy.instance.address)
        await rebalanceStrategy(strategy)
        const stkAaveAfter = await stakedAave.balanceOf(strategy.instance.address)
        expect(stkAaveAfter).to.be.gt(stkAaveBefore, 'should claim more stake aave')
      })

      it('Should startCooldown with rebalance', async function () {
        await time.increase(10 * 60 * 60)
        await rebalanceStrategy(strategy)
        const data = await strategy.instance.cooldownData()
        expect(data._cooldownStart).to.be.eq(await time.latest(), 'Cooldown start is not correct')
      })

      it('Should claim StakedAave accumulated in very long period', async function () {
        await rebalanceStrategy(strategy)
        // Takes time out of unstake window
        await time.increase(18 * 24 * 60 * 60)
        const balance1 = await stakedAave.balanceOf(strategy.instance.address)
        await rebalanceStrategy(strategy)
        const balance2 = await stakedAave.balanceOf(strategy.instance.address)
        expect(balance2).to.be.gt(balance1, 'should claim stake aave')
        // Stake aave rewards ends on July 15th which will results in no new stakedAave.
        await time.increase(120 * 24 * 60 * 60)
        await rebalanceStrategy(strategy)
        // It may have same value as previous if current time is greater than 15th July
        const balance3 = await stakedAave.balanceOf(strategy.instance.address)
        // 1626393600 = July 16th
        // if current time in fork > 16th July
        if ((await time.latest()).gte('1626393600')) {
          expect(balance3).to.be.eq(balance2, 'should NOT claim stake aave as there is nothing to')
        } else {
          expect(balance3).to.be.gt(balance2, 'should claim more stake aave')
        }
        // Increase time to be in unstake window
        await time.increase(11 * 24 * 60 * 60)
        // Unstake all StakedAave
        await rebalanceStrategy(strategy)
        const balance5 = await stakedAave.balanceOf(strategy.instance.address)
        expect(balance5).to.be.eq(0, 'should liquidate all stake aave and do not claim more')
      })
    })
  })
}

module.exports = {shouldClaimAaveRewards}
