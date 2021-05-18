'use strict'

const swapper = require('../utils/tokenSwapper')
const {expect} = require('chai')
const {ethers} = require('hardhat')
const time = require('../utils/time')

const AAVE_ADDRESS = '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9'
const STAKED_AAVE_ADDRESS = '0x4da27a545c0c5B758a6BA100e3a049001de870f5'

// Aave reward claim and unstake behavior tests for Aave and AaveMaker strategy
function shouldClaimAaveRewards(strategyIndex) {
  let strategy, aave, stakedAave
  let user1, user2, user3

  async function stakeAave(onBehalfOf, caller) {
    const aaveBalance = await swapper.swapEthForToken(100, AAVE_ADDRESS, caller)
    await aave.connect(caller.signer).approve(STAKED_AAVE_ADDRESS, aaveBalance)
    await stakedAave.connect(caller.signer).stake(onBehalfOf, aaveBalance)
  }

  describe('Claim Aave rewards', function () {
    beforeEach(async function () {
      ;[, user1, user2, user3] = this.users
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

      // TODO unstake via rebalance
      // TODO start cooldown via rebalance
      // TODO proper claim test via rebalance, claim always happen in rebalance
    })

    // TODO remove this test, check claimable should be part of claim via rebalance test
    // Just for claimable testing via user
    describe('Check claimable', function () {
      it('Should check claimable', async function () {
        await stakeAave(user1.address, user2)
        // const stakedAaveBalance = await stakedAave.balanceOf(user1.address)
        // console.log('Staked aave ', stakedAaveBalance.toString())
        await time.increase(110 * 24 * 60 * 60)
        await stakeAave(user1.address, user3)
        // console.log('time after 110 days', (await time.latest()).toString())
        // console.log('block before', (await time.latestBlock()).toString())
        await time.advanceBlock(1000)
        // console.log('block after', (await time.latestBlock()).toString())
        const claimable = await stakedAave.getTotalRewardsBalance(user1.address)
        // TODO this should not be zero
        // console.log('claimable aave', claimable.toString())

        // const stakedAaveBalance2 = await stakedAave.balanceOf(user1.address)
        // console.log('Staked aave ', stakedAaveBalance2.toString())
        await stakedAave.connect(user1.signer).claimRewards(user1.address, claimable)
        // const aaveBal = await aave.balanceOf(user1.address)
        // console.log('aave', aaveBal.toString())
      })
    })
  })
}

module.exports = {shouldClaimAaveRewards}
