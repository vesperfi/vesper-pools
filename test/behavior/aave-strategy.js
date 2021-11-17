'use strict'

const { expect } = require('chai')
const { getUsers } = require('../utils/setupHelper')
const { deposit } = require('../utils/poolOps')
const ZERO_ADDRESS = require('../../helper/ethereum/address').ZERO
const time = require('../utils/time')

// Aave strategy specific tests
function shouldBehaveLikeAaveStrategy(strategyIndex) {
  let strategy, user2
  let pool, token, collateralToken

  describe('AaveStrategy specific tests', function () {
    beforeEach(async function () {
      const users = await getUsers()
      ;[, , user2] = users
      strategy = this.strategies[strategyIndex].instance
      token = this.strategies[strategyIndex].token
      pool = this.pool
      collateralToken = this.collateralToken
    })

    it('Should increase totalValue due to aave rewards', async function () {
      if ((await strategy.aaveIncentivesController()) !== ZERO_ADDRESS) {
        await deposit(pool, collateralToken, 10, user2)
        await strategy.rebalance()
        const totalValueBefore = await strategy.totalValue()
        const aTokenBefore = await token.balanceOf(strategy.address)
        expect(totalValueBefore).to.be.eq(aTokenBefore, 'Total value should be = aToken balance')
        // Time travel to earn some aave rewards
        await time.increase(5 * 24 * 60 * 60)
        const totalValueAfter = await strategy.totalValue()
        const aTokenAfter = await token.balanceOf(strategy.address)
        expect(aTokenAfter).to.be.gt(aTokenBefore, 'aToken balance after should be > aToken balance before')
        expect(totalValueAfter).to.be.gt(aTokenAfter, 'total value should be > aToken balance after')
      }
    })
  })
}

module.exports = { shouldBehaveLikeAaveStrategy }
