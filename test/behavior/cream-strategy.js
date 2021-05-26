'use strict'

const {expect} = require('chai')
const {getUsers} = require('../utils/setupHelper')
const {deposit} = require('../utils/poolOps')

// Cream strategy specific tests
function shouldBehaveLikeCreamStrategy(strategyIndex) {
  let strategy, user1, pool, collateralToken
  describe('CreamStrategy specific tests', function () {
    
    beforeEach(async function () {
      const users = await getUsers()
      ;[user1] = users
      pool = this.pool
      strategy = this.strategies[strategyIndex].instance
      collateralToken = this.collateralToken
    })

 
    it('Should get total value', async function () {
      deposit(pool, collateralToken, 1, user1)
      await strategy.rebalance()
      const totalValue = await strategy.totalValue()
      expect(totalValue).to.be.equal(0, 'Total tokens should be zero')
    })

  })
}

module.exports = {shouldBehaveLikeCreamStrategy}
