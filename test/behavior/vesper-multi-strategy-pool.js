'use strict'

const hre = require('hardhat')
const { deposit: _deposit, rebalance, rebalanceStrategy } = require('../utils/poolOps')
const { expect } = require('chai')
const { makeNewStrategy } = require('../utils/setupHelper')
const { BigNumber } = require('ethers')
const DECIMAL = '1000000000000000000'
async function shouldBehaveLikeMultiStrategyPool(poolName) {
  let pool, strategies, collateralToken, accountant
  let user1, user2, gov

  async function deposit(amount, depositor) {
    return _deposit(pool, collateralToken, amount, depositor)
  }

  describe(`${poolName} multi-strategy`, function () {
    beforeEach(async function () {
      ;[gov, user1, user2] = this.users
      pool = this.pool
      accountant = this.accountant
      strategies = this.strategies
      collateralToken = this.collateralToken
      await accountant.connect(gov.signer).updateDebtRatio(strategies[0].instance.address, 4800)
      await accountant.connect(gov.signer).updateDebtRatio(strategies[1].instance.address, 4500)
    })

    describe(`${poolName}: Withdraw queue`, function () {
      beforeEach(async function () {
        await deposit(50, user1)
        await deposit(40, user2)
      })

      it('Should withdraw everything from 0th strategy.', async function () {
        await rebalance(strategies)
        let tokenHere = await pool.tokensHere()
        let debt0 = await pool.totalDebtOf(strategies[0].instance.address)
        const debt1Before = await pool.totalDebtOf(strategies[1].instance.address)
        const withdrawAmount = await pool.balanceOf(user1.address)
        const poolSharePrice = await pool.pricePerShare()
        const expectedAmount = withdrawAmount.mul(poolSharePrice).div(DECIMAL)
        const expectedFromS1 = expectedAmount.sub(tokenHere).sub(debt0)

        await pool.connect(user1.signer).withdraw(withdrawAmount)
        const debt1After = await pool.totalDebtOf(strategies[1].instance.address)
        const actualWithdrawFromS1 = debt1Before.sub(debt1After)

        debt0 = await pool.totalDebtOf(strategies[0].instance.address)
        tokenHere = await pool.tokensHere()
        expect(actualWithdrawFromS1).to.be.eq(expectedFromS1, 'Actual withdrawal from Strategy 1 is wrong')
        expect(debt0).to.be.eq(0, 'Debt of strategy 0 is wrong')
      })

      it('Should be able to shuffle withdraw queue', async function () {
        await accountant
          .connect(gov.signer)
          .updateWithdrawQueue([strategies[1].instance.address, strategies[0].instance.address])
        await rebalance(strategies)
        await rebalance(strategies)
        let tokenHere = await pool.tokensHere()
        const debt1Before = await pool.totalDebtOf(strategies[1].instance.address)
        const debt0Before = await pool.totalDebtOf(strategies[0].instance.address)
        const withdrawAmount = await pool.balanceOf(user1.address)
        const poolSharePrice = await pool.pricePerShare()
        const expectedAmount = withdrawAmount.mul(poolSharePrice).div(DECIMAL)
        let expectedFromS1 = expectedAmount.sub(tokenHere)
        const zero = BigNumber.from('0')
        let expectedFromS0
        if (expectedFromS1.lt(zero)) {
          expectedFromS1 = zero
          expectedFromS0 = zero
        } else {
          expectedFromS0 = expectedAmount.sub(tokenHere).sub(expectedFromS1)
        }
        await pool.connect(user1.signer).withdraw(withdrawAmount)
        const debt1After = await pool.totalDebtOf(strategies[1].instance.address)
        const debt0After = await pool.totalDebtOf(strategies[0].instance.address)
        const actualWithdrawFromS0 = debt0Before.sub(debt0After)
        const actualWithdrawFromS1 = debt1Before.sub(debt1After)
        tokenHere = await pool.tokensHere()
        expect(actualWithdrawFromS0).to.be.eq(expectedFromS0, 'Withdraw from Strategy 2 is wrong')
        expect(actualWithdrawFromS1).to.be.eq(expectedFromS1, 'Withdraw from Strategy 1 is wrong')
      })
    })

    describe(`${poolName}: Remove strategy via accountant`, function () {
      beforeEach(async function () {
        await deposit(50, user1)
      })

      it('Only governor should be able to remove strategy', async function () {
        const tx = accountant.connect(user2.signer).removeStrategy(1)
        await expect(tx).to.be.revertedWith('not-the-governor')
      })

      it('Should not remove if strategy has debt', async function () {
        await rebalance(strategies)
        const tx = accountant.connect(gov.signer).removeStrategy(1)
        await expect(tx).to.be.revertedWith('19')
      })

      it('Should remove if strategy has 0 debt', async function () {
        await rebalance(strategies)
        await accountant.connect(gov.signer).updateDebtRatio(strategies[0].instance.address, 0)
        await rebalance(strategies)
        const strategyParamsBefore = await pool.strategy(strategies[0].instance.address)
        await accountant.connect(gov.signer).removeStrategy(0)
        const strategy0 = (await pool.getStrategies())[0]
        expect(strategy0).to.be.eq(strategies[1].instance.address, 'wrong strategies array')
        const q0 = (await pool.getWithdrawQueue())[0]
        expect(q0).to.be.eq(strategies[1].instance.address, 'wrong strategies in withdraw queue')
        const strategyParamsAfter = await pool.strategy(strategies[0].instance.address)
        expect(strategyParamsBefore._active).to.be.eq(true, 'strategy should inactive')
        expect(strategyParamsAfter._active).to.be.eq(false, 'strategy should inactive')
      })

      it('Should adjust total debt ratio', async function () {
        const strategyParamsBefore = await pool.strategy(strategies[0].instance.address)
        const poolDebtRatioBefore = await pool.totalDebtRatio()
        await accountant.connect(gov.signer).removeStrategy('0')
        const poolDebtRatioAfter = await pool.totalDebtRatio()
        expect(poolDebtRatioBefore.sub(poolDebtRatioAfter)).to.be.eq(
          strategyParamsBefore._debtRatio,
          'debt ratio not adjusted',
        )
      })

      it('Should not disturb the withdraw queue order', async function () {
        await rebalance(strategies)

        const newStrategy = await makeNewStrategy(strategies[0], pool.address, {
          swapManager: hre.address.Vesper.SWAP_MANAGER,
        })

        await accountant.connect(gov.signer).updateDebtRatio(strategies[0].instance.address, 3000)
        await accountant.connect(gov.signer).updateDebtRatio(strategies[1].instance.address, 3000)

        const config = { debtRatio: 2000, externalDepositFee: 0 }
        await accountant.connect(gov.signer).addStrategy(newStrategy.instance.address, ...Object.values(config))
        await accountant
          .connect(gov.signer)
          .updateWithdrawQueue([
            newStrategy.instance.address,
            strategies[0].instance.address,
            strategies[1].instance.address,
          ])
        await rebalanceStrategy(newStrategy)
        await accountant.connect(gov.signer).updateDebtRatio(strategies[0].instance.address, 0)
        // This pay back all debt
        await rebalance(strategies)
        await accountant.connect(gov.signer).removeStrategy(0)
        // Withdraw queue order was 2,0,1 before 0th strategy is removed. new order is 2,1
        const queue = await pool.getWithdrawQueue()
        expect(queue[0]).to.be.eq(newStrategy.instance.address, 'wrong strategies in withdraw queue')
        expect(queue[1]).to.be.eq(strategies[1].instance.address, 'wrong strategies in withdraw queue')
      })
    })
  })
}

module.exports = { shouldBehaveLikeMultiStrategyPool }
