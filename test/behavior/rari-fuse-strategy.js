'use strict'

const {expect} = require('chai')
const {getUsers} = require('../utils/setupHelper')
const {deposit,rebalanceStrategy} = require('../utils/poolOps')

// Cream strategy specific tests
function shouldBehaveLikeRariFuseStrategy(strategyIndex) {
  let strategy, user1, pool, collateralToken
  describe('RariFuseStrategy specific tests', function () {
    
    beforeEach(async function () {
      const users = await getUsers()
      ;[user1] = users
      pool = this.pool
      strategy = this.strategies[strategyIndex]
      collateralToken = this.collateralToken
    })

 
    it('Should switch to a new Rari Fuse Pool', async function () {
      await deposit(pool, collateralToken, 10, user1)
      await rebalanceStrategy(strategy)

      const totalValueBefore = await strategy.instance.totalValue()
      const receiptTokenBefore = await strategy.instance.receiptToken()

      // Rari Fuse Strategy: Keeper switches from current Pool id to Pool #7 
      await strategy.instance.migrateFusePool(7)

      await rebalanceStrategy(strategy)

      const totalValue = await strategy.instance.totalValue()
      const receiptToken = await strategy.instance.receiptToken()

      expect(receiptToken).to.be.not.equal(receiptTokenBefore, 'Rari Fuse: Pool switch failed')
      expect(totalValue).to.be.gte(totalValueBefore,'Rari Fuse: totalValue is wrong')

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
  })
}

module.exports = {shouldBehaveLikeRariFuseStrategy}
