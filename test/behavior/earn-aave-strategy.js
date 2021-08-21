'use strict'

const { expect } = require('chai')
const { getUsers } = require('../utils/setupHelper')
const {deposit, timeTravel} = require('../utils/poolOps')
const Address = require('../../helper/ethereum/address')
const { shouldBehaveLikeAaveStrategy } = require('./aave-strategy')
const {ethers} = require('hardhat')

// Earn Aave strategy specific tests
function shouldBehaveLikeEarnAaveStrategy(strategyIndex) {
  let strategy, user2
  let pool, collateralToken

  shouldBehaveLikeAaveStrategy(strategyIndex)

  describe('EarnAaveStrategy specific tests', function () {
    beforeEach(async function () {
      const users = await getUsers()
        ;[, user2] = users
      strategy = this.strategies[strategyIndex].instance
      pool = this.pool
      collateralToken = this.collateralToken
    })

    it('Should increase DAI balance on rebalance', async function () {
      await deposit(pool, collateralToken, 40, user2)
      await strategy.rebalance()
      const dai = await ethers.getContractAt('ERC20', Address.DAI)
      const tokenBalanceBefore = await dai.balanceOf(this.earnDrip.address)
      await timeTravel(10 * 24 * 60 * 60)
      await strategy.rebalance()
      const tokenBalanceAfter = await dai.balanceOf(this.earnDrip.address)
      expect(tokenBalanceAfter).to.be.gt(tokenBalanceBefore, 'Should increase DAI balance in Aave strategy')
      await timeTravel()
      const withdrawAmount = await pool.balanceOf(user2.address)
      await pool.connect(user2.signer).withdrawETH(withdrawAmount)
      const earnedDai = await dai.balanceOf(user2.address)
      expect(earnedDai).to.be.gt(0, 'No dai earned')
    })
  })
}

module.exports = { shouldBehaveLikeEarnAaveStrategy }
