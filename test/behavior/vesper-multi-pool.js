'use strict'

const {deposit: _deposit, rebalance} = require('../utils/poolOps')
const {expect} = require('chai')
const {BN} = require('@openzeppelin/test-helpers')
async function shouldBehaveLikeMultiPool(poolName) {
  let pool, strategies, collateralToken
  let user1, user2

  async function deposit(amount, depositor) {
    return _deposit(pool, collateralToken, amount, depositor)
  }

  describe(`${poolName} multi-pool`, function () {
    beforeEach(async function () {
      ;[, user1, user2] = this.accounts
      // This setup helps in not typing 'this' all the time
      pool = this.pool
      strategies = this.strategies
      collateralToken = this.collateralToken
      await pool.updateDebtRatio(strategies[0].instance.address, 4800)
      await pool.updateDebtRatio(strategies[1].instance.address, 4500)
    })

    describe(`${poolName}: Should migrate from old strategy to new`, function () {
      it(`Should be able to migrate strategy successfully in ${poolName}`, async function () {
        await Promise.all([deposit(200, user2), deposit(200, user1)])
        await rebalance(strategies)
        const receiptToken = strategies[0].token
        const [
          totalSupplyBefore,
          totalValueBefore,
          totalDebtBefore,
          totalDebtRatioBefore,
          receiptTokenBefore,
        ] = await Promise.all([
          pool.totalSupply(),
          pool.totalValue(),
          pool.totalDebt(),
          pool.totalDebtRatio(),
          receiptToken.balanceOf(strategies[0].instance.address),
        ])
        // const
        const newStrategy = await strategies[0].artifact.new(pool.address)

        await pool.migrateStrategy(strategies[0].instance.address, newStrategy.address)

        const [
          totalSupplyAfter,
          totalValueAfter,
          totalDebtAfter,
          totalDebtRatioAfter,
          receiptTokenAfter,
          receiptTokenAfter2,
        ] = await Promise.all([
          pool.totalSupply(),
          pool.totalValue(),
          pool.totalDebt(),
          pool.totalDebtRatio(),
          receiptToken.balanceOf(strategies[0].instance.address),
          receiptToken.balanceOf(newStrategy.address),
        ])
        expect(totalSupplyAfter).to.be.bignumber.eq(
          totalSupplyBefore,
          `${poolName} total supply after migration is not correct`
        )
        expect(totalValueAfter).to.be.bignumber.eq(
          totalValueBefore,
          `${poolName} total value after migration is not correct`
        )
        expect(totalDebtAfter).to.be.bignumber.eq(
          totalDebtBefore,
          `${poolName} total debt after migration is not correct`
        )
        expect(totalDebtRatioAfter).to.be.bignumber.eq(
          totalDebtRatioBefore,
          `${poolName} total debt ratio after migration is not correct`
        )
        expect(receiptTokenAfter2).to.be.bignumber.gte(
          receiptTokenBefore,
          `${poolName} receipt  token balance of new strategy after migration is not correct`
        )
        expect(receiptTokenAfter).to.be.bignumber.eq(
          new BN('0'),
          `${poolName} receipt  token balance of new strategy after migration is not correct`
        )
      })
    })

    describe(`${poolName}: Withdraw queue`, function () {
      beforeEach(async function () {
        await deposit(80, user1)
        await deposit(20, user2)
      })

      it('Should withdraw everything from 0th strategy.', async function () {
        await rebalance(strategies)
        let tokenHere = await pool.tokensHere()
        let debt0 = (await pool.strategy(strategies[0].instance.address)).totalDebt
        const debt1Before = (await pool.strategy(strategies[1].instance.address)).totalDebt
        const withdrawAmount = await pool.balanceOf(user1)
        const expectedFromS1 = withdrawAmount.sub(tokenHere).sub(debt0)
        await pool.withdraw(withdrawAmount, {from: user1})
        const debt1After = (await pool.strategy(strategies[1].instance.address)).totalDebt
        const actualWithdrawFromS1 = debt1Before.sub(debt1After)
        debt0 = (await pool.strategy(strategies[0].instance.address)).totalDebt
        tokenHere = await pool.tokensHere()
        expect(actualWithdrawFromS1).to.be.bignumber.eq(expectedFromS1, 'Withdraw from Strategy 2 is wrong')
        expect(debt0).to.be.bignumber.eq(new BN('0'), 'Withdraw from Strategy 2 is wrong')
      })

      it('Should burn proportional amount if strategy do not return expected amount', async function () {
        await pool.updateDebtRatio(strategies[0].instance.address, 5000)
        await pool.updateDebtRatio(strategies[1].instance.address, 5000)
        await rebalance(strategies)
        await pool.updateWithdrawQueue([strategies[1].instance.address])
        let balance = await pool.balanceOf(user1)
        await pool.withdraw(balance, {from: user1})
        const debt = (await pool.strategy(strategies[1].instance.address)).totalDebt
        expect(debt).to.be.bignumber.eq(new BN('0'), 'Debt is strategy is wrong')
        balance = await pool.balanceOf(user1)
        expect(balance).to.be.bignumber.gt(new BN('0'), 'Remaining vToken balance of user is wrong')
        const balanceBeforeDeposit = await pool.balanceOf(user2)
        await deposit(20, user2)
        balance = await pool.balanceOf(user2)
        await pool.withdraw(balance, {from: user2})
        balance = await pool.balanceOf(user2)
        expect(balance).to.be.bignumber.eq(balanceBeforeDeposit, 'Withdraw from Strategy 2 is wrong')
      })

      it('Should be able to shuffle withdraw queue', async function () {
        await pool.updateWithdrawQueue([strategies[1].instance.address, strategies[0].instance.address])
        await rebalance(strategies)
        let tokenHere = await pool.tokensHere()
        let debt1 = (await pool.strategy(strategies[1].instance.address)).totalDebt
        const debt0Before = (await pool.strategy(strategies[0].instance.address)).totalDebt
        const withdrawAmount = await pool.balanceOf(user1)
        const expectedFromS0 = withdrawAmount.sub(tokenHere).sub(debt1)
        await pool.withdraw(withdrawAmount, {from: user1})
        const debt0After = (await pool.strategy(strategies[0].instance.address)).totalDebt
        const actualWithdrawFromS0 = debt0Before.sub(debt0After)
        debt1 = (await pool.strategy(strategies[1].instance.address)).totalDebt
        tokenHere = await pool.tokensHere()
        expect(actualWithdrawFromS0).to.be.bignumber.eq(expectedFromS0, 'Withdraw from Strategy 2 is wrong')
        expect(debt1).to.be.bignumber.eq(new BN('0'), 'Withdraw from Strategy 2 is wrong')
      })
    })

    describe(`${poolName}: total debt`, function () {
      it('Total of debt should not be more than total debt given to all strategy', async function () {
        // TODO:
      })

      it('Should decrease total debt of each strategy and withdraw from strategies', async function () {
        // TODO:
      })
    })
  })
}

module.exports = {shouldBehaveLikeMultiPool}
