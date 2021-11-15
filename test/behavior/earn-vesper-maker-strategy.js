'use strict'

const { deposit, executeIfExist, timeTravel, rebalanceStrategy } = require('../utils/poolOps')
const { expect } = require('chai')
const { swapEthForToken } = require('../utils/tokenSwapper')
const { ethers } = require('hardhat')
const { getUsers } = require('../utils/setupHelper')
const Address = require('../../helper/ethereum/address')
const { shouldValidateMakerCommonBehaviour } = require('./maker-common')
const { shouldBehaveLikeUnderlyingVesperPoolStrategy } = require('./strategy-underlying-vesper-pool')

async function shouldBehaveLikeEarnVesperMakerStrategy(strategyIndex) {
  let pool, strategy, cm, accountant
  let collateralToken
  let gov, user1, user2
  async function updateRate() {
    await executeIfExist(strategy.instance.token.exchangeRateCurrent)
    // Update rate using Jug drip
    const jugLike = await ethers.getContractAt('JugLike', '0x19c0976f590D67707E62397C87829d896Dc0f1F1')
    const vaultType = await strategy.instance.collateralType()
    await jugLike.drip(vaultType)
  }
  shouldValidateMakerCommonBehaviour(strategyIndex)
  shouldBehaveLikeUnderlyingVesperPoolStrategy(strategyIndex)
  describe(`MakerStrategy specific tests for strategy[${strategyIndex}]`, function () {
    beforeEach(async function () {
      ;[gov, user1, user2] = await getUsers()
      pool = this.pool
      strategy = this.strategies[strategyIndex]
      accountant = this.accountant
      cm = strategy.instance.collateralManager
      collateralToken = this.collateralToken
    })

    describe('Earning scenario', function () {
      beforeEach(async function () {
        await deposit(pool, collateralToken, 20, user1)
        await rebalanceStrategy(strategy)
      })

      it('Should increase dai balance on rebalance', async function () {
        await deposit(pool, collateralToken, 40, user2)
        await strategy.instance.rebalance()
        const dai = await ethers.getContractAt('ERC20', Address.DAI)
        const vDai = await ethers.getContractAt('ERC20', await strategy.instance.receiptToken())
        const poolRewards = await pool.poolRewards()

        const tokenBalanceBefore = await vDai.balanceOf(poolRewards)
        await timeTravel(10 * 24 * 60 * 60)
        await strategy.instance.rebalance()

        const tokenBalanceAfter = await vDai.balanceOf(poolRewards)
        expect(tokenBalanceAfter).to.be.gt(tokenBalanceBefore, 'Should increase vDai balance')
        await timeTravel()
        const withdrawAmount = await pool.balanceOf(user2.address)

        if (collateralToken.address === Address.WETH) await pool.connect(user2.signer).withdrawETH(withdrawAmount)
        else await pool.connect(user2.signer).withdraw(withdrawAmount)

        const earnedDai = await dai.balanceOf(user2.address)
        expect(earnedDai).to.be.gt(0, 'No dai earned')
      })

      it('Should payback all when debt ratio 0', async function () {
        await deposit(pool, collateralToken, 50, user2)
        await strategy.instance.rebalance()
        const vDAI = await strategy.instance.token()
        await timeTravel()
        await updateRate()
        await strategy.instance.rebalance()
        // Generating profit
        await swapEthForToken(1, Address.DAI, { signer: this.users[0].signer }, vDAI)
        await accountant.connect(gov.signer).updateDebtRatio(strategy.instance.address, 0)
        await strategy.instance.rebalance()
        const daiDebtAfter = await cm.getVaultDebt(strategy.instance.address)
        expect(daiDebtAfter).to.be.eq(0, 'Should increase vault debt on rebalance')
      })
    })
  })
}

module.exports = { shouldBehaveLikeEarnVesperMakerStrategy }
