'use strict'

const {expect} = require('chai')
const {ethers} = require('hardhat')

const time = require('./utils/time')
const poolOps = require('./utils/poolOps')
const {deployContract, getUsers, setupVPool} = require('./utils/setupHelper')
const StrategyType = require('./utils/strategyTypes')

const TOTAL_REWARD = ethers.utils.parseUnits('150000')

/* eslint-disable mocha/no-setup-in-describe */
describe('Rewards for VDAI Pool', function () {
  let vdai, dai, vsp, poolRewards
  let governor, user1, user2, user3

  const ONE_MILLION = ethers.utils.parseUnits('1000000', 'ether')
  const interestFee = '1500' // 15%
  const strategies = [
    {
      name: 'AaveStrategyDAI',
      type: StrategyType.AAVE,
      config: {interestFee, debtRatio: 9000, debtRate: ONE_MILLION},
    },
  ]
  beforeEach(async function () {
    const users = await getUsers()
    ;[governor, user1, user2, user3] = users
    await setupVPool(this, {
      poolName: 'VDAI',
      feeCollector: users[7].address,
      strategies: strategies.map((item, i) => ({
        ...item,
        feeCollector: users[i + 8].address, // leave first 8 users for other testing
      })),
    })
    vdai = this.pool
    dai = this.collateralToken
    vsp = await deployContract('VSP', [])
    poolRewards = await deployContract('PoolRewards', [vdai.address, vsp.address])
  })

  it('Only Governor should be able to distribute rewards', async function () {
    await vsp.connect(governor.signer).mint(poolRewards.address, TOTAL_REWARD)
    const tx = poolRewards.connect(user2.signer).notifyRewardAmount(TOTAL_REWARD)
    await expect(tx).to.be.revertedWith('not-authorized')

    expect(await poolRewards.rewardRate()).to.be.eq(0, 'Reward rate should be zero')
    await poolRewards.connect(governor.signer).notifyRewardAmount(TOTAL_REWARD)
    expect(await poolRewards.rewardRate()).to.be.gt(0, 'Reward rate should be > 0')
  })

  it('Ensure contract has balance before reward distribution starts', async function () {
    const tx = poolRewards.connect(governor.signer).notifyRewardAmount(TOTAL_REWARD)
    await expect(tx).to.be.revertedWith('rewards-too-high')
  })

  describe('Rewards claim', function () {
    beforeEach(async function () {
      await vsp.connect(governor.signer).mint(poolRewards.address, TOTAL_REWARD)
      await poolRewards.connect(governor.signer).notifyRewardAmount(TOTAL_REWARD)
    })

    it('Should claim Rewards', async function () {
      await poolOps.deposit(vdai, dai, 10, user1)
      await time.increase(34 * 24 * 60 * 60)
      await poolRewards.connect(user1.signer).claimReward(user1.address)
      const claimable = await poolRewards.claimable(user1.address)
      expect(claimable).to.be.eq(0, 'Claimable balance after claim should be 0')
      await vdai.connect(user1.signer).withdraw(await vdai.balanceOf(user1.address))
      const vspRewards = await vsp.balanceOf(user1.address)
      // ensure result is within .01%
      expect(TOTAL_REWARD.sub(vspRewards)).to.be.lte(vspRewards.div(10000), 'Should get correct reward')
    })

    it('Should claim Rewards of two rewards period', async function () {
      await poolOps.deposit(vdai, dai, 3, user1)
      await poolOps.deposit(vdai, dai, 3, user2)

      await time.increase(34 * 24 * 60 * 60)
      // await strategy.rebalance()
      const user1Claimable = await poolRewards.claimable(user1.address)
      expect(user1Claimable).to.be.gt(0, 'Claimable should be greater than zero')
      const user2Claimable = await poolRewards.claimable(user2.address)
      expect(user2Claimable).to.be.gt(0, 'Claimable should be greater than zero')

      await vsp.connect(governor.signer).mint(poolRewards.address, TOTAL_REWARD)
      await poolRewards.connect(governor.signer).notifyRewardAmount(TOTAL_REWARD)
      await time.increase(34 * 24 * 60 * 60)

      const user1ClaimableAfter = await poolRewards.claimable(user1.address)
      let totalClaimable = user1ClaimableAfter
      expect(user1ClaimableAfter).to.be.gt(user1Claimable, 'Claimable after should be greater')
      const user2ClaimableAfter = await poolRewards.claimable(user2.address)
      totalClaimable = totalClaimable.add(user2ClaimableAfter)
      expect(user2ClaimableAfter).to.be.gt(user2Claimable, 'Claimable after should be greater')

      const totalDistributed = TOTAL_REWARD.mul(2)
      // ensure result is within .01%
      expect(totalDistributed.sub(totalClaimable)).to.be.lte(totalClaimable.div(10000), 'Should get correct reward')
    })

    // TODO we do not support this yet
    // it('Should withdraw from pool and get all rewards', async function () {
    //   await poolOps.deposit(vdai, dai, 10, user2)
    //   await time.increase(34 * 24 * 60 * 60)
    //   await vdai.connect(user2.signer).withdraw(await vdai.balanceOf(user2.address))
    //   const claimable = await poolRewards.claimable(user2.address)
    //   expect(claimable).to.be.eq(0, 'Claimable balance after claim should be 0')
    //   const vspRewards = await vsp.balanceOf(user2.address)
    //   // ensure result is within .01%
    //   expect(TOTAL_REWARD.sub(vspRewards)).to.be.lte(vspRewards.div(10000), 'Should get correct reward')
    // })

    it('Should be able to claim rewards before withdraw', async function () {
      await poolOps.deposit(vdai, dai, 10, user3)
      await time.increase(34 * 24 * 60 * 60)
      await poolRewards.connect(user3.signer).claimReward(user3.address)
      const claimable = await poolRewards.claimable(user3.address)
      expect(claimable).to.be.eq(0, 'Claimable balance after claim should be 0')
      await vdai.connect(user3.signer).withdraw(await vdai.balanceOf(user3.address))
      const vBalance = await vdai.balanceOf(user3.address)
      expect(vBalance).to.be.eq(0, 'vToken balance after withdraw should be 0')
      await poolRewards.connect(user3.signer).claimReward(user3.address)
      const vspRewards = await vsp.balanceOf(user3.address)
      // ensure result is within .01%
      expect(TOTAL_REWARD.sub(vspRewards)).to.be.lte(vspRewards.div(10000), 'Should get correct reward')
    })

    it('Should claim rewards for multiple users', async function () {
      await poolOps.deposit(vdai, dai, 3, user2)
      await poolOps.deposit(vdai, dai, 3, user3)
      await time.increase(34 * 24 * 60 * 60)

      await poolRewards.connect(user2.signer).claimReward(user2.address)
      await poolRewards.connect(user3.signer).claimReward(user3.address)
      const vspBalance1 = await vsp.balanceOf(user2.address)
      const vspBalance2 = await vsp.balanceOf(user3.address)
      const totalGiven = vspBalance1.add(vspBalance2)
      // ensure result is within .01%
      expect(TOTAL_REWARD.sub(totalGiven)).to.be.lte(totalGiven.div(10000), 'Total rewards is wrong')
    })

    it('Should be able to claim rewards anytime', async function () {
      await poolOps.deposit(vdai, dai, 10, user1)
      await time.increase(10 * 24 * 60 * 60)
      await poolRewards.connect(user1.signer).claimReward(user1.address)
      const vspRewards = await vsp.balanceOf(user1.address)
      expect(vspRewards).to.be.gt(0, 'Rewards should be > 0')
    })

    it('Should get proper rewards even after pool token transfer', async function () {
      await poolOps.deposit(vdai, dai, 3, user1)
      // Time travel
      await time.increase(3 * 24 * 60 * 60)

      let claimable = await poolRewards.claimable(user1.address)
      expect(claimable).to.be.gt(0, 'Claimable should be greater than 0')
      claimable = await poolRewards.claimable(user2.address)
      expect(claimable).to.be.equal(0, 'Claimable should be zero')

      const vBalance = await vdai.balanceOf(user1.address)
      await vdai.connect(user1.signer).transfer(user2.address, vBalance.div(2))
      // Time travel
      await time.increase(2 * 24 * 60 * 60)

      claimable = await poolRewards.claimable(user1.address)
      expect(claimable).to.be.gt(0, 'Claimable should be greater than 0')
      claimable = await poolRewards.claimable(user2.address)
      expect(claimable).to.be.gt(0, 'Claimable should be greater than 0')
      // Claim reward for user2
      await poolRewards.connect(user2.signer).claimReward(user2.address)

      claimable = await poolRewards.claimable(user2.address)
      expect(claimable).to.be.equal(0, 'Claimable should be zero')

      const vspRewards2 = await vsp.balanceOf(user2.address)
      expect(vspRewards2).to.be.gt(0, 'Reward balance should be greater than 0')

      // Claim reward for user1
      await poolRewards.connect(user1.signer).claimReward(user1.address)

      claimable = await poolRewards.claimable(user1.address)
      expect(claimable).to.be.equal(0, 'Claimable should be zero')

      const vspRewards1 = await vsp.balanceOf(user1.address)
      expect(vspRewards1).to.be.gt(0, 'Reward balance should be greater than 0')
      expect(vspRewards1).to.be.gt(vspRewards2, 'Reward of user1 should be higher')
    })
  })
})
