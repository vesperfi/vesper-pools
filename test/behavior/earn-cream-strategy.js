'use strict'

const {expect} = require('chai')
const {getUsers} = require('../utils/setupHelper')
const {deposit, timeTravel} = require('../utils/poolOps')
const { shouldBehaveLikeCreamStrategy } = require('./cream-strategy')
const Address = require('../../helper/ethereum/address')
const {ethers} = require('hardhat')

// Earn Compound strategy specific tests
function shouldBehaveLikeEarnCreamStrategy(strategyIndex) {
  let strategy, user2, pool, collateralToken, token

  shouldBehaveLikeCreamStrategy(strategyIndex)

  describe('EarnCreamStrategy specific tests', function () {
    beforeEach(async function () {
      const users = await getUsers()
      ;[, user2] = users
      pool = this.pool
      strategy = this.strategies[strategyIndex].instance
      collateralToken = this.collateralToken
      token = this.strategies[strategyIndex].token
    })

    it('Should increase DAI balance on rebalance', async function () {
      await deposit(pool, collateralToken, 40, user2)
      await strategy.rebalance()
      const pricePerShareBefore = await pool.pricePerShare()
      const dai = await ethers.getContractAt('ERC20', Address.DAI)
      const vDai = await ethers.getContractAt('ERC20', Address.vDAI)
      const tokenBalanceBefore = await vDai.balanceOf(this.earnDrip.address)
      await timeTravel('',100, 'compound')
      await token.accrueInterest()
      await strategy.rebalance()
      const tokenBalanceAfter = await vDai.balanceOf(this.earnDrip.address)
      expect(tokenBalanceAfter).to.be.gt(tokenBalanceBefore, 'Should increase vDAI balance in Cream strategy')
      await timeTravel()
      const withdrawAmount = await pool.balanceOf(user2.address)
      await pool.connect(user2.signer).withdrawETH(withdrawAmount)
      const earnedDai = await dai.balanceOf(user2.address)
      expect(earnedDai).to.be.gt(0, 'No dai earned')
      const pricePerShareAfter = await pool.pricePerShare()
      expect(pricePerShareBefore).to.eq(pricePerShareAfter,'Price per share shouldn\'t increase')
    })

  })
}

module.exports = {shouldBehaveLikeEarnCreamStrategy}
