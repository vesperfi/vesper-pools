'use strict'

const {expect} = require('chai')
const {getUsers} = require('../utils/setupHelper')
const {deposit, timeTravel} = require('../utils/poolOps')
const { shouldBehaveLikeCompoundStrategy } = require('./compound-strategy')
const Address = require('../../helper/ethereum/address')
const {ethers} = require('hardhat')
const DECIMAL6 = ethers.BigNumber.from('1000000')

// Earn Compound strategy specific tests
function shouldBehaveLikeEarnCompoundStrategy(strategyIndex) {
  let strategy, user2, pool, collateralToken

  shouldBehaveLikeCompoundStrategy(strategyIndex)
  
  describe('EarnCompoundStrategy specific tests', function () {
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
      await timeTravel('',100, 'compound')
      await strategy.rebalance()
      const tokenBalanceAfter = await vDai.balanceOf(this.earnDrip.address)
      expect(tokenBalanceAfter).to.be.gt(tokenBalanceBefore, 'Should increase vDAI balance in Compound strategy')
      const pricePerShareAfter = await pool.pricePerShare()

      // Allow some room for dust errors
      expect(pricePerShareBefore.div(DECIMAL6)).to.gte(
        pricePerShareAfter.div(DECIMAL6),
        'Price per share shouldn\'t increase'
      )

      await timeTravel('',100, 'compound')
      const withdrawAmount = await pool.balanceOf(user2.address)

      if (collateralToken.address === Address.WETH)
        await pool.connect(user2.signer).withdrawETH(withdrawAmount)
      else
        await pool.connect(user2.signer).withdraw(withdrawAmount)

      const earnedDai = await dai.balanceOf(user2.address)
      expect(earnedDai).to.be.gt(0, 'No dai earned')
    })

  })
}

module.exports = {shouldBehaveLikeEarnCompoundStrategy}
