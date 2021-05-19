'use strict'

const {expect} = require('chai')
const {getUsers, getEvent} = require('../utils/setupHelper')
const {deposit} = require('../utils/poolOps')
const {advanceBlock} = require('../utils/time')
const COMP = '0xc00e94Cb662C3520282E6f5717214004A7f26888'

// Compound strategy specific tests
function shouldBehaveLikeCompoundStrategy(strategyIndex) {
  let strategy, user1, pool, collateralToken, token
  describe('CompoundStrategy specific tests', function () {
    beforeEach(async function () {
      const users = await getUsers()
      ;[user1] = users
      pool = this.pool
      strategy = this.strategies[strategyIndex].instance
      collateralToken = this.collateralToken
      token = this.strategies[strategyIndex].token
    })

    it('Should get COMP token as reserve token', async function () {
      expect(await strategy.isReservedToken(COMP)).to.be.equal(true, 'COMP token is reserved')
    })

    it('Should get total value', async function () {
      deposit(pool, collateralToken, 1, user1)
      await strategy.rebalance()
      const totalValue = await strategy.totalValue()
      expect(totalValue).to.be.equal(0, 'Total tokens should be zero')
    })

    it('Should migrate to new strategy', async function () {
      // TODO error caller-is-not-vesper-pool
      // await strategy.connect(pool.signer).migrate(newStrategy.address)
    })

    it('Should claim COMP when rebalance is called', async function () {
      await deposit(pool, collateralToken, 1, user1)
      const totalValueBefore = await strategy.totalValue()
      const totalDebtBefore = (await pool.strategy(strategy.address)).totalDebt
      expect(totalValueBefore).to.be.equal(totalDebtBefore, 'Total value should be same as total debt')
      const beforeBalance = await token.balanceOf(strategy.address)
      await strategy.rebalance()
      await advanceBlock(50)
      const afterBalance = await token.balanceOf(strategy.address)
      expect(afterBalance).to.be.gt(beforeBalance, 'token balance should increase')
    })

    it('Should liquidate COMP when claimed by external source', async function () {
      await deposit(pool, collateralToken, 100, user1)
      await strategy.rebalance()
      await advanceBlock(100)
      let txnObj = await strategy.rebalance()
      let event = await getEvent(txnObj, pool, 'EarningReported')
      expect(event.payback).to.be.equal(0, 'Should have 0 payback')
      expect(event.poolDebt).to.be.equal(event.strategyDebt, 'Should have same strategyDebt and poolDebt')

      const withdrawAmount = await pool.balanceOf(user1.address)
      await pool.connect(user1.signer).withdraw(withdrawAmount)

      txnObj = await strategy.rebalance()
      event = await getEvent(txnObj, pool, 'EarningReported')
      expect(event.payback).to.be.gt(0, 'Should have > 0 payback')
      expect(event.poolDebt).to.be.equal(event.strategyDebt, 'Should have same strategyDebt and poolDebt')

      txnObj = await strategy.rebalance()
      event = await getEvent(txnObj, pool, 'EarningReported')
      expect(event.payback).to.be.equal(0, 'Should have 0 payback')
      expect(event.poolDebt).to.be.equal(event.strategyDebt, 'Should have same strategyDebt and poolDebt')
    })
  })
}

module.exports = {shouldBehaveLikeCompoundStrategy}
