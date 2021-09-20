'use strict'

const {expect} = require('chai')
const {getUsers} = require('../utils/setupHelper')
const {deposit, timeTravel, rebalanceStrategy} = require('../utils/poolOps')
const Address = require('../../helper/ethereum/address')
const {ethers} = require('hardhat')

// Earn Yearn strategy specific tests
function shouldBehaveLikeEarnYearnStrategy(strategyIndex) {
  let strategy, user2, pool, collateralToken

  describe('EarnYearnStrategy specific tests', function () {
    beforeEach(async function () {
      const users = await getUsers()
      ;[, user2] = users
      pool = this.pool
      strategy = this.strategies[strategyIndex]
      collateralToken = this.collateralToken
    })

    it('Should increase DAI balance on rebalance', async function () {
      await deposit(pool, collateralToken, 40, user2)
      await rebalanceStrategy(strategy)
      const dai = await ethers.getContractAt('ERC20', Address.DAI)
      const vDai = await ethers.getContractAt('ERC20', Address.vDAI)
      const tokenBalanceBefore = await vDai.balanceOf(this.earnDrip.address)
      await timeTravel('',100, 'compound')
      await rebalanceStrategy(strategy)
      const tokenBalanceAfter = await vDai.balanceOf(this.earnDrip.address)
      expect(tokenBalanceAfter).to.be.gt(tokenBalanceBefore, 'Should increase vDAI balance in Yearn strategy')
      await timeTravel()
      const withdrawAmount = await pool.balanceOf(user2.address)
      expect(withdrawAmount).gt(0, 'Invalid withdraw amount')
      await pool.connect(user2.signer).withdrawETH(withdrawAmount)
      const earnedDai = await dai.balanceOf(user2.address)
      expect(earnedDai).to.be.gt(0, 'No dai earned')
    })

  })
}

module.exports = {shouldBehaveLikeEarnYearnStrategy}
