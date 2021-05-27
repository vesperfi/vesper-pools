'use strict'

const {deposit: _deposit, rebalance, timeTravel} = require('../utils/poolOps')
const {deployContract} = require('../utils/setupHelper')
const {rebalanceStrategy} = require('../utils/poolOps')
const {expect} = require('chai')

async function shouldMigrateStrategies(poolName) {
  let pool, strategies, collateralToken
  let user1, user2, gov, swapManager

  async function deposit(amount, depositor) {
    return _deposit(pool, collateralToken, amount, depositor)
  }

  async function assertMigrateStrategy(oldStrategy, newStrategy, receiptToken) {
    await Promise.all([deposit(200, user2), deposit(200, user1)])
    await rebalance(strategies)
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
    expect(receiptTokenAfter2).to.be.gte(
      receiptTokenBefore,
      `${poolName} receipt  token balance of new strategy after migration is not correct`
    )
    expect(receiptTokenAfter).to.be.eq(
      0,
      `${poolName} receipt  token balance of new strategy after migration is not correct`
    )
  }

  async function assertDeposit() {
    await deposit(10, user1)
    const amount = await pool.balanceOf(user1.address)
    expect(amount).to.be.gt(0, 'failed to deposit in pool')
  }

  async function assertWithdraw(newStrategy) {
    await deposit(5, user1)
    const amountBefore = await pool.balanceOf(user1.address)
    await rebalanceStrategy(newStrategy)
    await pool.connect(user1.signer).withdraw(amountBefore)
    const amountAfter = await pool.balanceOf(user1.address)
    expect(amountAfter).to.be.equal(0, 'amount should be 0 after withdraw')
  }

  async function assertTotalDebt(newStrategy) {
    await deposit(20, user2)
    await rebalanceStrategy(newStrategy)
    let strategyParams = await pool.strategy(newStrategy.instance.address)
    const totalDebtBefore = strategyParams.totalDebt
    await deposit(20, user2)
    await rebalanceStrategy(newStrategy)
    strategyParams = await pool.strategy(newStrategy.instance.address)
    const totalDebtAfter = strategyParams.totalDebt
    expect(totalDebtAfter).to.be.gt(totalDebtBefore, `Total debt of strategy in ${poolName} is wrong`)
  }

  async function assertProfit(newStrategy) {
    await deposit(200, user2)
    await rebalanceStrategy(newStrategy)
    await timeTravel()
    await rebalanceStrategy(newStrategy)
    const strategyParams = await pool.strategy(newStrategy.instance.address)
    const totalProfit = strategyParams.totalProfit
    expect(totalProfit).to.be.gt(0, `Total debt of strategy in ${poolName} is wrong`)
  }

  async function prepareNewStrategy(strategyIndex) {
    const oldStrategy = strategies[strategyIndex]
    const newStrategy = {}
    if (oldStrategy.type.includes('Maker')) {
      newStrategy.instance = await deployContract(oldStrategy.name, [
        pool.address,
        strategies[strategyIndex].instance.collateralManager.address,
        swapManager.address,
      ])
      await newStrategy.instance.updateBalancingFactor(310, 260)
    } else {
      newStrategy.instance = await deployContract(oldStrategy.name, [pool.address, swapManager.address])
    }
    newStrategy.token = oldStrategy.token
    newStrategy.type = oldStrategy.type
    await newStrategy.instance.init()
    await newStrategy.instance.approveToken()
    await newStrategy.instance.updateFeeCollector(oldStrategy.feeCollector)
    return newStrategy
  }

  async function strategyMigration(strategyIndex) {
    const newStrategy = await prepareNewStrategy(strategyIndex)
    await assertMigrateStrategy(strategies[strategyIndex], newStrategy, strategies[strategyIndex].token)
    await assertDeposit()
    await assertWithdraw(newStrategy)
    await assertTotalDebt(newStrategy)
    await assertProfit(newStrategy)
  }

  describe(`${poolName} Strategy Migration`, function () {
    beforeEach(async function () {
      ;[gov, user1, user2] = this.users
      pool = this.pool
      strategies = this.strategies
      collateralToken = this.collateralToken
      swapManager = await deployContract('SwapManager')
      await pool.connect(gov.signer).updateDebtRatio(strategies[0].instance.address, 4800)
      await pool.connect(gov.signer).updateDebtRatio(strategies[1].instance.address, 4500)
    })

    describe(`${poolName}: Should migrate from one strategy to another one`, function () {
      it(`Should be able to migrate strategy[0] for ${poolName}`, async function () {
        const strategyIndex = 0
        const newStrategy = await prepareNewStrategy(strategyIndex)
        await assertMigrateStrategy(strategies[strategyIndex], newStrategy, strategies[strategyIndex].token)
      })
      it(`Should be able to migrate strategy[1] for ${poolName}`, async function () {
        const strategyIndex = 1
        const newStrategy = await prepareNewStrategy(strategyIndex)
        await assertMigrateStrategy(strategies[strategyIndex], newStrategy, strategies[strategyIndex].token)
      })
    })

    describe(`${poolName}: Post migration`, function () {
      it(`Should work all common operation for strategy[0] ${poolName}`, async function () {
        await strategyMigration(0)
      })

      it(`Should work all common operation for strategy[1] ${poolName}`, async function () {
        await strategyMigration(1)
      })
    })
  })
}

module.exports = {shouldMigrateStrategies}
