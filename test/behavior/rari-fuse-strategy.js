'use strict'

const { expect } = require('chai')
const { deposit, rebalanceStrategy, timeTravel } = require('../utils/poolOps')
const { ethers } = require('hardhat')
const address = require('../../helper/mainnet/address')

// Rari Fuse strategy specific tests
function shouldBehaveLikeRariFuseStrategy(strategyIndex) {
  let strategy, user1, pool, collateralToken
  describe('RariFuseStrategy specific tests', function () {
    beforeEach(async function () {
      const users = this.users
      ;[user1] = users
      pool = this.pool
      strategy = this.strategies[strategyIndex]
      collateralToken = this.collateralToken
    })

    it('Should switch to a new Rari Fuse Pool', async function () {
      // pool 7 do not support WBTC
      const newPoolId = collateralToken.address === address.WBTC ? 79 : 7
      // No other fuse pool has APE as collateral as of now
      if (collateralToken.address !== address.APE) {
        await deposit(pool, collateralToken, 10, user1)
        await rebalanceStrategy(strategy)

        const totalValueBefore = await strategy.instance.totalValue()
        const receiptTokenBefore = await strategy.instance.receiptToken()

        // Rari Fuse Strategy: Keeper switches from current Pool id to Pool #7
        await strategy.instance.migrateFusePool(newPoolId)

        await rebalanceStrategy(strategy)

        const totalValue = await strategy.instance.totalValue()
        const receiptToken = await strategy.instance.receiptToken()

        expect(receiptToken).to.be.not.equal(receiptTokenBefore, 'Rari Fuse: Pool switch failed')
        expect(totalValue).to.be.gte(totalValueBefore, 'Rari Fuse: totalValue is wrong')
      }
    })

    it('Should be able to deposit more after switch to a new Rari Fuse Pool', async function () {
      // pool 7 do not support WBTC
      const newPoolId = collateralToken.address === address.WBTC ? 79 : 7
      // No other fuse pool has APE as collateral as of now
      if (collateralToken.address !== address.APE) {
        await deposit(pool, collateralToken, 10, user1)
        await rebalanceStrategy(strategy)

        // Rari Fuse Strategy: Keeper switches from current Pool id to Pool #7
        await strategy.instance.migrateFusePool(newPoolId)
        await rebalanceStrategy(strategy)
        const totalValueBefore = await strategy.instance.totalValue()
        // Deposit more
        await deposit(pool, collateralToken, 10, user1)
        await rebalanceStrategy(strategy)
        expect(await strategy.instance.totalValue()).to.be.gt(totalValueBefore, 'Rari Fuse: totalValue is wrong')
      }
    })

    it('Should not switch to the same Rari Fuse Pool', async function () {
      await deposit(pool, collateralToken, 10, user1)
      await rebalanceStrategy(strategy)

      const fusePoolId = await strategy.instance.fusePoolId()

      expect(strategy.instance.migrateFusePool(fusePoolId)).to.be.revertedWith('same-fuse-pool')
    })
    it('Should fail switching to a wrong Rari Fuse Pool', async function () {
      await deposit(pool, collateralToken, 10, user1)
      await rebalanceStrategy(strategy)

      expect(strategy.instance.migrateFusePool(999)).to.be.revertedWith('')
    })

    it('Should claim rewards correctly, if any', async function () {
      const rewardTokenAddr = await strategy.instance.rewardToken()
      if (rewardTokenAddr !== address.ZERO) {
        await deposit(pool, collateralToken, 20, user1)
        const rewardToken = await ethers.getContractAt('IERC20', rewardTokenAddr)
        await rebalanceStrategy(strategy)
        await timeTravel(3600 * 24 * 2) // 2 days
        const rewardDistributorAddr = await strategy.instance.rewardDistributor()
        const rewardDistributor = await ethers.getContractAt('IRariRewardDistributor', rewardDistributorAddr)
        const rewards = await rewardDistributor.compAccrued(strategy.instance.address)
        if (rewards.gt(0)) {
          await strategy.instance.claimRewards()
          expect(await rewardToken.balanceOf(strategy.instance.address)).to.be.gt(0)
        }
      }
    })
  })
}

module.exports = { shouldBehaveLikeRariFuseStrategy }
