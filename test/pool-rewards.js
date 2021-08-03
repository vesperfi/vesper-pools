'use strict'

const {expect} = require('chai')
const {ethers} = require('hardhat')

const time = require('./utils/time')
const poolOps = require('./utils/poolOps')
const {deployContract, getUsers, setupVPool} = require('./utils/setupHelper')
const StrategyType = require('./utils/strategyTypes')
const PoolConfig = require('../helper/ethereum/poolConfig')
const MULTICALL = require('../helper/ethereum/address').MULTICALL

const TOTAL_REWARD = ethers.utils.parseUnits('150000')
const REWARD_DURATION = 30 * 24 * 60 * 60

describe('Rewards for VDAI Pool', function () {
  let vdai, dai, vsp, poolRewards, poolRewardsImpl
  let governor, user1, user2, user3
  let proxyAdmin, proxy

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
      poolConfig: PoolConfig.VDAI,
      feeCollector: users[7].address,
      strategies: strategies.map((item, i) => ({
        ...item,
        feeCollector: users[i + 8].address, // leave first 8 users for other testing
      })),
    })
    vdai = this.pool
    dai = this.collateralToken
    vsp = await deployContract('VSP', [])
    // Deploy pool rewards implementation
    poolRewardsImpl = await deployContract('PoolRewards', [])
    // Deploy proxy admin
    proxyAdmin = await deployContract('ProxyAdmin', [])
    const initData = poolRewardsImpl.interface.encodeFunctionData('initialize', [vdai.address, vsp.address])
    // deploy proxy with logic implementation
    proxy = await deployContract('TransparentUpgradeableProxy', [poolRewardsImpl.address, proxyAdmin.address, initData])
    // Get implementation from proxy
    poolRewards = await ethers.getContractAt('PoolRewards', proxy.address)
    await vdai.updatePoolRewards(proxy.address)
  })

  describe('Governor function tests', function () {
    it('Should revert if non governor try to distribute rewards', async function () {
      const tx = poolRewards.connect(user2.signer).notifyRewardAmount(TOTAL_REWARD, REWARD_DURATION)
      await expect(tx).to.be.revertedWith('not-authorized')
    })

    it('Only Governor should be able to distribute rewards', async function () {
      await vsp.connect(governor.signer).mint(poolRewards.address, TOTAL_REWARD)
      expect(await poolRewards.rewardRate()).to.be.eq(0, 'Reward rate should be zero')
      await poolRewards.connect(governor.signer).notifyRewardAmount(TOTAL_REWARD, REWARD_DURATION)
      const rewardRate = await poolRewards.rewardRate()
      expect(rewardRate).to.be.gt(0, 'Reward rate should be > 0')
      const rewardForDuration = await poolRewards.rewardForDuration()
      expect(rewardForDuration).to.be.eq(rewardRate.mul(REWARD_DURATION), 'Incorrect reward for duration')
    })

    it('Ensure contract has balance before reward distribution starts', async function () {
      const tx = poolRewards.connect(governor.signer).notifyRewardAmount(TOTAL_REWARD, REWARD_DURATION)
      await expect(tx).to.be.revertedWith('rewards-too-high')
    })
  })

  describe('Reward claim', function () {
    beforeEach(async function () {
      await vsp.connect(governor.signer).mint(poolRewards.address, TOTAL_REWARD)
      await poolRewards.connect(governor.signer).notifyRewardAmount(TOTAL_REWARD, REWARD_DURATION)
    })

    it('Should claim Rewards', async function () {
      await poolOps.deposit(vdai, dai, 10, user1)
      await time.increase(34 * 24 * 60 * 60)
      await poolRewards.connect(user1.signer).claimReward(user1.address)
      const claimable = await poolRewards.claimable(user1.address)
      expect(claimable).to.be.eq(0, 'Claimable balance after claim should be 0')
      await vdai.connect(user1.signer).withdraw(await vdai.balanceOf(user1.address))
      const vspRewards = await vsp.balanceOf(user1.address)
      // ensure dust is within .01%, due to rounding
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
      await poolRewards.connect(governor.signer).notifyRewardAmount(TOTAL_REWARD, REWARD_DURATION)
      await time.increase(34 * 24 * 60 * 60)

      const user1ClaimableAfter = await poolRewards.claimable(user1.address)
      let totalClaimable = user1ClaimableAfter
      expect(user1ClaimableAfter).to.be.gt(user1Claimable, 'Claimable after should be greater')
      const user2ClaimableAfter = await poolRewards.claimable(user2.address)
      totalClaimable = totalClaimable.add(user2ClaimableAfter)
      expect(user2ClaimableAfter).to.be.gt(user2Claimable, 'Claimable after should be greater')

      const totalDistributed = TOTAL_REWARD.mul(2)
      // ensure dust is within .01%, due to rounding
      expect(totalDistributed.sub(totalClaimable)).to.be.lte(totalClaimable.div(10000), 'Should get correct reward')
    })

    it('Should claim rewards via withdraw', async function () {
      await poolOps.deposit(vdai, dai, 10, user2)
      await time.increase(34 * 24 * 60 * 60)
      await vdai.connect(user2.signer).withdraw(await vdai.balanceOf(user2.address))
      const claimable = await poolRewards.claimable(user2.address)
      expect(claimable).to.be.eq(0, 'Claimable balance after claim should be 0')
      const vspRewards = await vsp.balanceOf(user2.address)
      expect(vspRewards).to.be.gt(0, 'Rewards should be > 0')
      // ensure dust is within .01%, due to rounding
      expect(TOTAL_REWARD.sub(vspRewards)).to.be.lte(vspRewards.div(10000), 'Should get correct reward')
    })

    it('Should claim rewards via deposit', async function () {
      await poolOps.deposit(vdai, dai, 10, user2)
      await time.increase(34 * 24 * 60 * 60)
      await poolOps.deposit(vdai, dai, 1, user2)
      const claimable = await poolRewards.claimable(user2.address)
      expect(claimable).to.be.eq(0, 'Claimable balance after claim should be 0')
      const vspRewards = await vsp.balanceOf(user2.address)
      expect(vspRewards).to.be.gt(0, 'Rewards should be > 0')
      // ensure dust is within .01%, due to rounding
      expect(TOTAL_REWARD.sub(vspRewards)).to.be.lte(vspRewards.div(10000), 'Should get correct reward')
    })

    it('Should claim rewards before withdraw', async function () {
      await poolOps.deposit(vdai, dai, 10, user3)
      await time.increase(34 * 24 * 60 * 60)
      await poolRewards.connect(user3.signer).claimReward(user3.address)
      const claimable = await poolRewards.claimable(user3.address)
      expect(claimable).to.be.eq(0, 'Claimable balance after claim should be 0')
      await vdai.connect(user3.signer).withdraw(await vdai.balanceOf(user3.address))
      const vBalance = await vdai.balanceOf(user3.address)
      expect(vBalance).to.be.eq(0, 'vToken balance after withdraw should be 0')
      const vspRewards = await vsp.balanceOf(user3.address)
      // ensure dust is within .01%, due to rounding
      expect(TOTAL_REWARD.sub(vspRewards)).to.be.lte(vspRewards.div(10000), 'Should get correct reward')
    })

    it('Should claim rewards after withdraw', async function () {
      await poolOps.deposit(vdai, dai, 10, user2)
      await time.increase(34 * 24 * 60 * 60)
      await vdai.connect(user2.signer).withdraw(await vdai.balanceOf(user2.address))
      await poolRewards.connect(user2.signer).claimReward(user2.address)
      const claimable = await poolRewards.claimable(user2.address)
      expect(claimable).to.be.eq(0, 'Claimable balance after claim should be 0')
      const vspRewards = await vsp.balanceOf(user2.address)
      expect(vspRewards).to.be.gt(0, 'Rewards should be > 0')
      // ensure dust is within .01%, due to rounding
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
      // ensure dust is within .01%, due to rounding
      expect(TOTAL_REWARD.sub(totalGiven)).to.be.lte(totalGiven.div(10000), 'Total rewards is wrong')
    })

    it('Should claim rewards anytime', async function () {
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

      // Trigger reward calculation by another transfer
      await vdai.connect(user2.signer).transfer(user3.address, await vdai.balanceOf(user2.address))
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

  describe('Reward update', function () {
    let totalRewards = ethers.utils.parseUnits('1000')
    const duration = 10 * 24 * 60 * 60
    beforeEach(async function () {
      await poolOps.deposit(vdai, dai, 3, user1)
      await vsp.connect(governor.signer).mint(poolRewards.address, totalRewards)
      await poolRewards.connect(governor.signer).notifyRewardAmount(totalRewards, duration)
    })

    it('Should claim proper rewards before and after notifyRewardAmount', async function () {
      await time.increase(6 * 24 * 60 * 60)
      const expectedClaimable = ethers.utils.parseUnits('600')
      const claimable = await poolRewards.claimable(user1.address)
      // ensure dust is within .01%, due to rounding
      expect(expectedClaimable.sub(claimable)).to.be.lte(claimable.div(10000), 'Claimable is wrong')

      await vsp.connect(governor.signer).mint(poolRewards.address, ethers.utils.parseUnits('100'))
      const newDuration = 2 * 24 * 60 * 60
      const newRewards = ethers.utils.parseUnits('100')
      totalRewards = totalRewards.add(newRewards)
      await poolRewards.connect(governor.signer).notifyRewardAmount(ethers.utils.parseUnits('100'), newDuration)
      await time.increase(newDuration)

      const finalClaimable = await poolRewards.claimable(user1.address)
      // ensure dust is within .01%, due to rounding
      expect(totalRewards.sub(finalClaimable)).to.be.lte(finalClaimable.div(10000), 'Final claimable is wrong')
    })
  })

  describe('Update proxy implementation', function () {
    let proxyAddress

    beforeEach(async function () {
      // Give some rewards to be able to test storage after upgrading
      await vsp.connect(governor.signer).mint(poolRewards.address, TOTAL_REWARD)
      await poolRewards.connect(governor.signer).notifyRewardAmount(TOTAL_REWARD, REWARD_DURATION)

      // Deploy new implementation
      poolRewardsImpl = await deployContract('PoolRewards', [])

      proxyAddress = poolRewards.address
    })

    it('Should upgrade in proxy directly', async function () {
      const rewardRateBefore = await poolRewards.rewardRate()

      // Upgrade proxy to point to new implementation
      await proxyAdmin.connect(governor.signer).upgrade(proxy.address, poolRewardsImpl.address)
      poolRewards = await ethers.getContractAt('PoolRewards', proxy.address)

      expect(poolRewards.address === proxyAddress, 'Pool rewards proxy address should be same').to.be.true
      const rewardRateAfter = await poolRewards.rewardRate()
      expect(rewardRateAfter).to.be.eq(rewardRateBefore, 'Reward rate after proxy upgrade should be same as before')
    })

    describe('Upgrader', function () {
      let upgrader

      beforeEach(async function () {
        // Deploy upgrader
        upgrader = await deployContract('PoolRewardsUpgrader', [MULTICALL])

        // Transfer proxy ownership to the upgrader
        await proxyAdmin.connect(governor.signer).changeProxyAdmin(proxy.address, upgrader.address)
      })

      it('Should upgrade in proxy via upgrader', async function () {
        // Trigger upgrade
        await upgrader.connect(governor.signer).safeUpgrade(proxy.address, poolRewardsImpl.address)
  
        poolRewards = await ethers.getContractAt('PoolRewards', proxy.address)
        expect(poolRewards.address === proxyAddress, 'Pool rewards proxy address should be same').to.be.true
      })
  
      it('Should properly revert wrong upgrades via upgrader', async function () {
        // Trigger upgrade
        await expect(upgrader.connect(governor.signer).safeUpgrade(proxy.address, MULTICALL)).to.be.reverted
      })
    })
  })
})
