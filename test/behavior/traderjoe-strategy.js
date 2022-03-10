'use strict'

const { expect } = require('chai')
const { getUsers, unlock } = require('../utils/setupHelper')
const { deposit, rebalanceStrategy } = require('../utils/poolOps')
const { shouldBehaveLikeCompoundStrategy } = require('../behavior/compound-strategy')
const { ethers } = require('hardhat')
const { advanceBlock } = require('../utils/time')

// Trader Joe strategy specific tests
function shouldBehaveLikeTraderJoeStrategy(strategyIndex) {
  let strategy, user1, pool, collateralToken, receiptToken, comptroller

  shouldBehaveLikeCompoundStrategy(strategyIndex)

  describe('TraderJoeStrategy specific tests', function () {
    beforeEach(async function () {
      const users = await getUsers()
      ;[user1] = users
      pool = this.pool
      strategy = this.strategies[strategyIndex]
      collateralToken = this.collateralToken
      receiptToken = this.strategies[strategyIndex].instance.receiptToken()
      comptroller = await ethers.getContractAt('Comptroller', await strategy.instance.COMPTROLLER())
    })

    it('Should claim extra AVAX rewards on rebalance', async function () {
      await deposit(pool, collateralToken, 10, user1)
      await rebalanceStrategy(strategy)

      const joetroller = await ethers.getContractAt('ComptrollerMultiReward', comptroller.address)
      const rewardDistributor = await ethers.getContractAt('IRewardDistributor', await joetroller.rewardDistributor())
      const rewardAdmin = await unlock(await rewardDistributor.admin())

      // Force AVAX platform rewards to be enabled again

      const totalValueBefore = await strategy.instance.totalValue()
      await rewardDistributor
        .connect(rewardAdmin)
        ._setRewardSpeed(1, receiptToken, ethers.utils.parseEther('10000'), ethers.utils.parseEther('10000'))

      await advanceBlock(100)

      await rebalanceStrategy(strategy)
      await rebalanceStrategy(strategy)

      expect(await strategy.instance.totalValue()).to.be.gt(totalValueBefore)
    })
  })
}

module.exports = { shouldBehaveLikeTraderJoeStrategy }
