'use strict'

const {deposit, executeIfExist, timeTravel, rebalanceStrategy} = require('../utils/poolOps')
const {expect} = require('chai')
const {ethers} = require('hardhat')
const {getUsers, getEvent} = require('../utils/setupHelper')
const {shouldValidateMakerCommonBehaviour} = require('./maker-common')

function shouldBehaveLikeMakerStrategy(strategyIndex) {
  let pool, strategy, token, accountant
  let collateralToken, cm
  let user1, user2

  async function updateRate() {
    await executeIfExist(strategy.instance.token.exchangeRateCurrent)
    // Update rate using Jug drip
    const jugLike = await ethers.getContractAt('JugLike', '0x19c0976f590D67707E62397C87829d896Dc0f1F1')
    const vaultType = await strategy.instance.collateralType()
    await jugLike.drip(vaultType)
  }
  shouldValidateMakerCommonBehaviour(strategyIndex)
  describe(`MakerStrategy specific tests for strategy[${strategyIndex}]`, function () {
    beforeEach(async function () {
      ;[user1, user2] = await getUsers()
      pool = this.pool
      accountant = this.accountant
      strategy = this.strategies[strategyIndex]
      collateralToken = this.collateralToken
      token = this.strategies[strategyIndex].token
      cm = strategy.instance.collateralManager
    })

    describe('Earning scenario', function () {
      beforeEach(async function () {
        await deposit(pool, collateralToken, 20, user1)
        await rebalanceStrategy(strategy)
      })

      it('Should increase pool token on rebalance', async function () {
        const tokensHere = await pool.tokensHere()
        // Time travel trigger some earning
        await timeTravel()
        await executeIfExist(token.exchangeRateCurrent)
        await rebalanceStrategy(strategy)

        const tokensHereAfter = await pool.tokensHere()
        expect(tokensHereAfter).to.be.gt(tokensHere, 'Collateral token in pool should increase')
      })

      describe('Interest fee calculation via Jug Drip', function () {
        it('Should earn interest fee', async function () {
          const feeBalanceBefore = await pool.balanceOf(strategy.instance.address)
          const totalSupplyBefore = await pool.totalSupply()
          await deposit(pool, collateralToken, 50, user2)

          await rebalanceStrategy(strategy)
          await timeTravel()
          await updateRate()

          const feeBalanceAfter = await pool.balanceOf(strategy.instance.address)
          expect(feeBalanceAfter).to.be.gt(feeBalanceBefore, 'Fee should increase')

          const totalSupplyAfter = await pool.totalSupply()
          expect(totalSupplyAfter).to.be.gt(totalSupplyBefore, 'Total supply should increase')
        })
      })

      it('Should increase dai balance on rebalance', async function () {
        await deposit(pool, collateralToken, 40, user2)
        await rebalanceStrategy(strategy)
        const tokenBalanceBefore = await token.balanceOf(strategy.instance.address)
        await timeTravel()
        await updateRate()
        const txnObj = await rebalanceStrategy(strategy)
        const event = await getEvent(txnObj, accountant, 'EarningReported')
        const tokenBalanceAfter = await token.balanceOf(strategy.instance.address)
        expect(event.profit).to.be.gt(0, 'Should have some profit')
        expect(event.loss).to.be.equal(0, 'Should have no loss')
        expect(tokenBalanceAfter).to.be.gt(tokenBalanceBefore, 'Should increase dai balance in aave maker strategy')
      })

      it('Should increase vault debt on rebalance', async function () {
        await deposit(pool, collateralToken, 50, user2)
        await rebalanceStrategy(strategy)
        const daiDebtBefore = await cm.getVaultDebt(strategy.instance.address)
        await timeTravel()
        await updateRate()
        await rebalanceStrategy(strategy)
        const daiDebtAfter = await cm.getVaultDebt(strategy.instance.address)
        expect(daiDebtAfter).to.be.gt(daiDebtBefore, 'Should increase vault debt on rebalance')
      })      
    })
  })
}

module.exports = {shouldBehaveLikeMakerStrategy}
