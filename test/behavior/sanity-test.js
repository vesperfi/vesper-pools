'use strict'

const {unlock} = require('../utils/setupHelper')
const {deposit: _deposit, totalDebtOfAllStrategy, reset} = require('../utils/poolOps')
const time = require('../utils/time')
const chaiAlmost = require('chai-almost')
const chai = require('chai')
chai.use(chaiAlmost(1))
const expect = chai.expect
const {BigNumber: BN} = require('ethers')

const DECIMAL18 = BN.from('1000000000000000000')
const MAX_BPS = BN.from('10000')
async function shouldDoSanityTest(poolName, collateralName) {
  let pool, strategies, collateralToken, collateralDecimal
  let user1, signer

  async function deposit(amount, depositor) {
    return _deposit(pool, collateralToken, amount, depositor)
  }

  function convertTo18(amount) {
    const multiplier = DECIMAL18.div(BN.from(10).pow(collateralDecimal))
    return BN.from(amount).mul(multiplier)
  }

  async function rebalanceAllStrategies() {
    for (const strategy of strategies) {
      const strategyMetadata = await pool.strategy(strategy.instance.address)
      if (strategyMetadata._active) {
        await strategy.instance.connect(signer).rebalance()
      }
    }
  }
  afterEach(reset)

  describe(`${poolName} basic operation tests`, function () {
    beforeEach(async function () {
      ;[, user1] = this.users
      // This setup helps in not typing 'this' all the time
      pool = this.pool
      strategies = this.strategies
      collateralToken = this.collateralToken
      // Decimal will be used for amount conversion
      collateralDecimal = await this.collateralToken.decimals()
      signer = await unlock(await pool.governor())
    })

    describe(`Deposit ${collateralName} into the ${poolName} pool`, function () {
      it(`Should deposit ${collateralName}`, async function () {
        const tsBefore = await pool.totalSupply()
        await deposit(10, user1)
        return Promise.all([pool.totalSupply(), pool.totalValue(), pool.balanceOf(user1.address)]).then(function ([
          totalSupply,
          vPoolBalance,
        ]) {
          expect(totalSupply).gt(tsBefore, `Total supply of ${poolName} is wrong`)
          expect(vPoolBalance).gt(0, `${poolName} balance of user is wrong`)
        })
      })
    })

    describe(`Withdraw ${collateralName} from ${poolName} pool`, function () {
      it(`Should withdraw all ${collateralName} before rebalance`, async function () {
        const tsBefore = await pool.totalSupply()
        await deposit(20, user1)
        const withdrawAmount = await pool.balanceOf(user1.address)
        await pool.connect(user1.signer).withdraw(withdrawAmount)
        const fee = await pool.withdrawFee()
        const feeToCollect = withdrawAmount.mul(fee).div(MAX_BPS)
        return Promise.all([pool.totalSupply(), pool.balanceOf(user1.address)]).then(function ([
          tsAfter,
          vPoolBalance,
        ]) {
          expect(tsAfter).to.be.equal(feeToCollect.add(tsBefore), `Total supply of ${poolName} is wrong`)
          expect(vPoolBalance).to.be.equal(0, `${poolName} balance of user is wrong`)
        })
      })

      it(`Should withdraw partial ${collateralName} before rebalance`, async function () {
        await deposit(20, user1)
        let vPoolBalance = await pool.balanceOf(user1.address)
        const withdrawAmount = vPoolBalance.sub(convertTo18(100))
        await pool.connect(user1.signer).withdraw(withdrawAmount)
        vPoolBalance = (await pool.balanceOf(user1.address)).toString()
        const totalDebt = await pool.totalDebt()
        const totalDebtOfStrategies = await totalDebtOfAllStrategy(strategies, pool)
        expect(totalDebtOfStrategies).to.be.equal(totalDebt, `${collateralName} totalDebt of strategies is wrong`)
        expect(vPoolBalance).to.equal(convertTo18(100), `${poolName} balance of user is wrong`)
      })
    })

    describe('Rebalance', function () {
      it(`Should increase pool value ${collateralName}`, async function () {
        const tvBefore = await pool.totalValue()
        const tdBefore = await pool.totalDebt()
        await deposit(10, user1)
        rebalanceAllStrategies()
        await time.increase(3 * 24 * 60 * 60)
        rebalanceAllStrategies()
        return Promise.all([pool.totalValue(), pool.totalDebt(), pool.balanceOf(user1.address)]).then(function ([
          tvAfter,
          tdAfter,
          vPoolBalance,
        ]) {
          expect(tdAfter).gt(tdBefore, `Total supply of ${poolName} is wrong`)
          expect(tvAfter).gt(tvBefore, `Total value of ${poolName} is wrong`)
          expect(vPoolBalance).gt(0, `${poolName} balance of user is wrong`)
        })
      })
    })
  })
}

module.exports = {shouldDoSanityTest}
