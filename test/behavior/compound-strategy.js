'use strict'

const {expect} = require('chai')
const swapper = require('../utils/tokenSwapper')
const {getUsers} = require('../utils/setupHelper')
const {deposit} = require('../utils/poolOps')
const {advanceBlock} = require('../utils/time')
const COMP = '0xc00e94Cb662C3520282E6f5717214004A7f26888'
const COMPTROLLER = '0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B'
const {ethers} = require('hardhat')

// Compound strategy specific tests
function shouldBehaveLikeCompoundStrategy(strategyIndex) {
  let strategy, user1, user2, pool, collateralToken, token, comp, comptroller
  describe('CompoundStrategy specific tests', function () {
    beforeEach(async function () {
      const users = await getUsers()
      ;[user1, user2] = users
      pool = this.pool
      strategy = this.strategies[strategyIndex].instance
      collateralToken = this.collateralToken
      token = this.strategies[strategyIndex].token
      comp = await ethers.getContractAt('ERC20', COMP)
      comptroller = await ethers.getContractAt('Comptroller', COMPTROLLER)
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

    it('Should claim COMP when rebalance is called', async function () {
      await deposit(pool, collateralToken, 1, user1)      
      await strategy.rebalance()
      await token.exchangeRateCurrent()
      await advanceBlock(100)
      const withdrawAmount = await pool.balanceOf(user1.address)
      // compAccrued is updated only when user do some activity. withdraw to trigger compAccrue update
      await pool.connect(user1.signer).withdraw(withdrawAmount)
      const compAccruedBefore = await comptroller.compAccrued(strategy.address)
      await strategy.rebalance()   
      const compAccruedAfter = await comptroller.compAccrued(strategy.address)                   
      expect(compAccruedBefore).to.be.gt(0, 'comp accrued should be > 0 before rebalance')     
      expect(compAccruedAfter).to.be.equal(0, 'comp accrued should be 0 after rebalance')     
    })

    it('Should liquidate COMP when claimed by external source', async function () {
      await deposit(pool, collateralToken, 1, user1)
      await strategy.rebalance()
      await swapper.swapEthForToken(10, COMP, user2, strategy.address)
      const afterSwap = await comp.balanceOf(strategy.address)
      expect(afterSwap).to.be.gt(0, 'COMP balance should increase on strategy address')
      await comptroller.claimComp(strategy.address, [token.address], {from: user1.address})
      const afterClaim = await comp.balanceOf(strategy.address)
      expect(afterClaim).to.be.gt(afterSwap, 'COMP balance increase after claim')
      await advanceBlock(100)
      await token.exchangeRateCurrent()
      await strategy.rebalance()
      const compBalance = await comp.balanceOf(strategy.address)
      expect(compBalance).to.be.equal('0', 'COMP balance should be 0 on rebalance')
    })
  })
}

module.exports = {shouldBehaveLikeCompoundStrategy}
