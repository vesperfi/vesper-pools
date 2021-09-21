'use strict'

const {expect} = require('chai')
const swapper = require('../utils/tokenSwapper')
const {getUsers} = require('../utils/setupHelper')
const {deposit} = require('../utils/poolOps')
const {advanceBlock} = require('../utils/time')
const {ethers} = require('hardhat')

const CRV = '0xD533a949740bb3306d119CC777fa900bA034cd52'

// crv strategy specific tests
function shouldBehaveLikeCrvStrategy(strategyIndex) {
  let strategy, user1, user2, pool, collateralToken, crv
  describe('CurveStrategy specific tests', function () {
    beforeEach(async function () {
      const users = await getUsers()
      ;[user1, user2] = users
      pool = this.pool
      strategy = this.strategies[strategyIndex].instance
      collateralToken = this.collateralToken
      crv = await ethers.getContractAt('ERC20', CRV)
    })

    it('Should get CRV token as reserve token', async function () {
      expect(await strategy.isReservedToken(CRV)).to.be.true
      const crvLP = await strategy.threeCrv()
      expect(await strategy.isReservedToken(crvLP)).to.be.true
    })

    it('Should get total value', async function () {
      deposit(pool, collateralToken, 1, user1)
      await strategy.rebalance()
      const totalValue = await strategy.totalValue()
      expect(totalValue).to.be.equal(0, 'Total tokens should be zero')
    })

    it('Should claim CRV when rebalance is called', async function () {
      await deposit(pool, collateralToken, 1, user1)      
      await strategy.rebalance()
      await strategy.rebalance()
      await advanceBlock(1000)
      await strategy.setCheckpoint()
      const crvAccruedBefore = await strategy.claimableRewards()
      await strategy.rebalance()   
      const crvAccruedAfter = await strategy.claimableRewards()                  
      expect(crvAccruedBefore).to.be.gt(0, 'crv accrued should be > 0 before rebalance')     
      expect(crvAccruedAfter).to.be.equal(0, 'crv accrued should be 0 after rebalance')     
    })

    it('Should liquidate CRV when claimed by external source', async function () {
      await deposit(pool, collateralToken, 1, user1)
      await strategy.rebalance()
      await swapper.swapEthForToken(10, CRV, user2, strategy.address)
      const afterSwap = await crv.balanceOf(strategy.address)
      expect(afterSwap).to.be.gt(0, 'CRV balance should increase on strategy address')
      await strategy.rebalance()
      const crvBalance = await crv.balanceOf(strategy.address)
      expect(crvBalance).to.be.equal('0', 'CRV balance should be 0 on rebalance')
    })
  })
}

module.exports = {shouldBehaveLikeCrvStrategy}
