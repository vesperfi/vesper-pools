'use strict'

const swapper = require('../utils/tokenSwapper')
const {expect} = require('chai')
const {ethers} = require('hardhat')
const time = require('../utils/time')
const AAVE_ADDRESS = '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9'
const STAKED_AAVE_ADDRESS = '0x4da27a545c0c5B758a6BA100e3a049001de870f5'

// TODO merge aave rewards tests in aave-strategy.js file 

// Aave reward claim and unstake behavior tests for Aave and AaveMaker strategy
function shouldClaimAaveRewards(strategyIndex) {
  let strategy, aave, stakedAave
  let user1, user2

  async function stakeAave(onBehalfOf, caller) {
    const aaveBalance = await swapper.swapEthForToken(100, AAVE_ADDRESS, caller)
    await aave.connect(caller.signer).approve(STAKED_AAVE_ADDRESS, aaveBalance)
    await stakedAave.connect(caller.signer).stake(onBehalfOf, aaveBalance)
  }

  describe('Claim Aave rewards', function () {
    beforeEach(async function () {
      ;[, user1, user2] = this.users
      strategy = this.strategies[strategyIndex].instance
      aave = await ethers.getContractAt('ERC20', AAVE_ADDRESS)
      stakedAave = await ethers.getContractAt('StakedAave', STAKED_AAVE_ADDRESS)
    })

    describe('Start cooldown', function () {
      it('Should return false for canStartCooldown', async function () {
        const canStartCooldown = await strategy.canStartCooldown()
        expect(canStartCooldown).to.be.false
      })

      it('Should return true for canStartCooldown', async function () {
        await stakeAave(strategy.address, user1)
        const canStartCooldown = await strategy.canStartCooldown()
        expect(canStartCooldown).to.be.true
      })

      it('Should startCooldown', async function () {
        await stakeAave(strategy.address, user1)
        await strategy.startCooldown()
        const data = await strategy.cooldownData()
        expect(data._cooldownStart).to.be.eq(await time.latest(), 'Cooldown start is not correct')
      })
    })

    describe('Unstake StakedAave', function () {
      beforeEach(async function () {
        await stakeAave(strategy.address, user2)
        await strategy.startCooldown()
        // time trave 11 days which take us between cooldown end and unstake end
        await time.increase(11 * 24 * 60 * 60)
      })

      it('Should unstake StakedAave', async function () {
        const stakedAaveBefore = await stakedAave.balanceOf(strategy.address)
        expect(stakedAaveBefore).to.be.gt(0, 'StakedAave balance should be > 0')
        await strategy.unstakeAave()
        const stakedAaveAfter = await stakedAave.balanceOf(strategy.address)
        expect(stakedAaveAfter).to.be.eq(0, 'StakedAave balance should be equal 0')
      })
    })

    describe('rebalance', function () {
      it('Should unstake StakedAave with rebalance', async function () {
        await stakeAave(strategy.address, user1)
        await strategy.startCooldown()
        // time trave 11 days which take us between cooldown end and unstake end
        await time.increase(11 * 24 * 60 * 60)
        const stakedAaveBefore = await stakedAave.balanceOf(strategy.address)
        expect(stakedAaveBefore).to.be.gt(0, 'StakedAave balance should be > 0')
        await strategy.rebalance()
        const stakedAaveAfter = await stakedAave.balanceOf(strategy.address)
        expect(stakedAaveAfter).to.be.eq(0, 'StakedAave balance should be equal 0')
      })

      it('Should startCooldown with rebalance', async function () {
        await stakeAave(strategy.address, user1)
        await strategy.rebalance()
        const data = await strategy.cooldownData()
        expect(data._cooldownStart).to.be.eq(await time.latest(), 'Cooldown start is not correct')
      })
    })
  })
}

module.exports = {shouldClaimAaveRewards}