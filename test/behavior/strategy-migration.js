'use strict'

const { makeNewStrategy } = require('../utils/setupHelper')
const { deposit: _deposit, timeTravel, rebalanceStrategy } = require('../utils/poolOps')
const StrategyType = require('../utils/strategyTypes')
const { expect } = require('chai')

async function shouldMigrateStrategies(poolName) {
  let pool, strategies, collateralToken
  let user1, user2, gov
  const options = { skipVault: true, addressListFactory: '0xded8217De022706A191eE7Ee0Dc9df1185Fb5dA3' }

  async function deposit(amount, depositor) {
    return _deposit(pool, collateralToken, amount, depositor)
  }

  async function migrateAndAssert(oldStrategy, newStrategy, receiptToken) {
    await Promise.all([deposit(50, user2), deposit(30, user1)])
    await rebalanceStrategy(oldStrategy)
    const [totalSupplyBefore, totalValueBefore, totalDebtBefore, totalDebtRatioBefore, receiptTokenBefore] =
      await Promise.all([
        pool.totalSupply(),
        pool.totalValue(),
        pool.totalDebt(),
        pool.totalDebtRatio(),
        receiptToken.balanceOf(oldStrategy.instance.address),
      ])

    await pool.connect(gov.signer).migrateStrategy(oldStrategy.instance.address, newStrategy.instance.address)

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
      receiptToken.balanceOf(oldStrategy.instance.address),
      receiptToken.balanceOf(newStrategy.instance.address),
    ])
    expect(totalSupplyAfter).to.be.eq(totalSupplyBefore, `${poolName} total supply after migration is not correct`)
    expect(totalValueAfter).to.be.eq(totalValueBefore, `${poolName} total value after migration is not correct`)
    expect(totalDebtAfter).to.be.eq(totalDebtBefore, `${poolName} total debt after migration is not correct`)
    expect(totalDebtRatioAfter).to.be.eq(
      totalDebtRatioBefore,
      `${poolName} total debt ratio after migration is not correct`
    )
    if (newStrategy.type === StrategyType.COMPOUND_LEVERAGE) {
      // new strategy will have less receipt tokens due to deleverage at migration
      expect(receiptTokenAfter2).to.be.lt(
        receiptTokenBefore,
        `${poolName} receipt  token balance of new strategy after migration is not correct`
      )
    } else {
      expect(receiptTokenAfter2).to.be.gte(
        receiptTokenBefore,
        `${poolName} receipt  token balance of new strategy after migration is not correct`
      )
    }
    expect(receiptTokenAfter).to.be.eq(
      0,
      `${poolName} receipt  token balance of new strategy after migration is not correct`
    )
  }

  async function assertDepositAndWithdraw(newStrategy) {
    await deposit(50, user2)
    const amountBefore = await pool.balanceOf(user2.address)
    expect(amountBefore).to.be.gt(0, 'failed to deposit in pool')
    await rebalanceStrategy(newStrategy)
    await pool.connect(user2.signer).withdraw(amountBefore)
    const amountAfter = await pool.balanceOf(user2.address)
    expect(amountAfter).to.be.equal(0, 'amount should be 0 after withdraw')
  }

  async function assertTotalDebt(newStrategy) {
    await deposit(40, user2)
    await rebalanceStrategy(newStrategy)
    const totalDebtBefore = await pool.totalDebtOf(newStrategy.instance.address)
    await deposit(50, user2)
    await rebalanceStrategy(newStrategy)
    const totalDebtAfter = await pool.totalDebtOf(newStrategy.instance.address)
    expect(totalDebtAfter).to.be.gt(totalDebtBefore, `Total debt of strategy in ${poolName} is wrong`)
  }

  async function assertProfit(newStrategy) {
    await timeTravel()
    await rebalanceStrategy(newStrategy)
    const strategyParams = await pool.strategy(newStrategy.instance.address)
    const totalProfit = strategyParams._totalProfit
    expect(totalProfit).to.be.gt(0, `Total debt of strategy in ${poolName} is wrong`)
  }

  async function strategyMigration(strategy) {
    const newStrategy = await makeNewStrategy(strategy, pool.address, options)
    await migrateAndAssert(strategy, newStrategy, strategy.token)
    await assertDepositAndWithdraw(newStrategy)
    await assertTotalDebt(newStrategy)
    await assertProfit(newStrategy)
  }

  describe(`${poolName} Strategy Migration`, function () {
    beforeEach(async function () {
      ;[gov, user1, user2] = this.users
      pool = this.pool
      strategies = this.strategies
      collateralToken = this.collateralToken
    })

    it(`Should be able to migrate strategies for ${poolName}`, async function () {
      for (const strategy of strategies) {
        await strategyMigration(strategy)
      }
    })
  })
}

module.exports = { shouldMigrateStrategies }
