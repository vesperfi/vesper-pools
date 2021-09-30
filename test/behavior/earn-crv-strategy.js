'use strict'

const {expect} = require('chai')
const {getUsers} = require('../utils/setupHelper')
const {deposit} = require('../utils/poolOps')
const {advanceBlock} = require('../utils/time')
const {shouldBehaveLikeCrvStrategy} = require('./crv-strategy')
const Address = require('../../helper/ethereum/address')
const {ethers} = require('hardhat')

// Earn Curve strategy specific tests
function shouldBehaveLikeEarnCrvStrategy(strategyIndex) {
  let strategy, user2, pool, collateralToken

  shouldBehaveLikeCrvStrategy(strategyIndex)

  describe('EarnCrvStrategy specific tests', function () {
    beforeEach(async function () {
      const users = await getUsers()
      ;[, user2] = users
      pool = this.pool
      strategy = this.strategies[strategyIndex].instance
      collateralToken = this.collateralToken
    })

    it('Should increase DAI balance on rebalance', async function () {
      await deposit(pool, collateralToken, 40, user2)
      await strategy.rebalance()
      const pricePerShareBefore = await pool.pricePerShare()
      const dai = await ethers.getContractAt('ERC20', Address.DAI)
      const vDai = await ethers.getContractAt('ERC20', Address.vDAI)
      const tokenBalanceBefore = await vDai.balanceOf(this.earnDrip.address)
      await advanceBlock(100)
      await strategy.setCheckpoint()
      await strategy.rebalance()
      const tokenBalanceAfter = await vDai.balanceOf(this.earnDrip.address)
      expect(tokenBalanceAfter).to.be.gt(tokenBalanceBefore, 'Should increase vDAI balance in CRV strategy')
      const pricePerShareAfter = await pool.pricePerShare()
      expect(pricePerShareBefore).to.eq(pricePerShareAfter,'Price per share shouldn\'t increase')

      const withdrawAmount = await pool.balanceOf(user2.address)

      await pool.connect(user2.signer).withdraw(withdrawAmount)

      const earnedDai = await dai.balanceOf(user2.address)
      expect(earnedDai).to.be.gt(0, 'No dai earned')
    })
  })
}

module.exports = {shouldBehaveLikeEarnCrvStrategy}
