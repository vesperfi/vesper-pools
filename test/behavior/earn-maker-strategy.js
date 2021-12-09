'use strict'

const { deposit, executeIfExist, timeTravel, rebalanceStrategy } = require('../utils/poolOps')
const { expect } = require('chai')
const { ethers } = require('hardhat')
const { getUsers } = require('../utils/setupHelper')
const Address = require('../../helper/mainnet/address')
const { shouldValidateMakerCommonBehavior } = require('./maker-common')
async function shouldBehaveLikeEarnMakerStrategy(strategyIndex) {
  let pool, strategy
  let collateralToken, cm
  let user1, user2
  async function updateRate() {
    await executeIfExist(strategy.instance.token.exchangeRateCurrent)
    // Update rate using Jug drip
    const jugLike = await ethers.getContractAt('JugLike', '0x19c0976f590D67707E62397C87829d896Dc0f1F1')
    const vaultType = await strategy.instance.collateralType()
    await jugLike.drip(vaultType)
  }
  shouldValidateMakerCommonBehavior(strategyIndex)
  describe(`Earn MakerStrategy specific tests for strategy[${strategyIndex}]`, function () {
    beforeEach(async function () {
      ;[user1, user2] = await getUsers()
      pool = this.pool
      strategy = this.strategies[strategyIndex]
      collateralToken = this.collateralToken
      cm = strategy.instance.collateralManager
    })

    describe('Earning scenario', function () {
      beforeEach(async function () {
        await deposit(pool, collateralToken, 20, user1)
        await rebalanceStrategy(strategy)
      })

      describe('Interest fee calculation via Jug Drip', function () {
        it('Should earn interest fee', async function () {
          const dai = await ethers.getContractAt('ERC20', Address.DAI)
          const fc = await strategy.instance.feeCollector()
          const feeBalanceBefore = await dai.balanceOf(fc)
          await deposit(pool, collateralToken, 50, user2)
          await strategy.instance.rebalance()
          await timeTravel(5 * 24 * 60 * 60, 'compound')
          await strategy.instance.rebalance()
          const feeBalanceAfter = await dai.balanceOf(fc)
          expect(feeBalanceAfter).to.be.gt(feeBalanceBefore, 'Fee should increase')
        })
      })

      it('Should increase vault debt on rebalance', async function () {
        await deposit(pool, collateralToken, 50, user2)
        await strategy.instance.rebalance()
        const daiDebtBefore = await cm.getVaultDebt(strategy.instance.address)
        await timeTravel()
        await updateRate()
        await strategy.instance.rebalance()
        const daiDebtAfter = await cm.getVaultDebt(strategy.instance.address)
        expect(daiDebtAfter).to.be.gt(daiDebtBefore, 'Should increase vault debt on rebalance')
      })
    })
  })
}

module.exports = { shouldBehaveLikeEarnMakerStrategy }
