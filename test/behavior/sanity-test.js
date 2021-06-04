'use strict'

const {deposit: _deposit, totalDebtOfAllStrategy} = require('../utils/poolOps')
const chaiAlmost = require('chai-almost')
const chai = require('chai')
chai.use(chaiAlmost(1))
const expect = chai.expect
const {BigNumber: BN} = require('ethers')

const DECIMAL18 = BN.from('1000000000000000000')
const MAX_BPS = BN.from('10000')

async function shouldDoSanityTest(poolName, collateralName) {
  let pool, strategies, collateralToken, collateralDecimal
  let user1

  async function deposit(amount, depositor) {
    return _deposit(pool, collateralToken, amount, depositor)
  }

  function convertTo18(amount) {
    const multiplier = DECIMAL18.div(BN.from(10).pow(collateralDecimal))
    return BN.from(amount).mul(multiplier)
  }

  describe(`${poolName} basic operation tests`, function () {
    beforeEach(async function () {
      ;[, user1] = this.users
      // This setup helps in not typing 'this' all the time
      pool = this.pool
      strategies = this.strategies
      collateralToken = this.collateralToken
      // Decimal will be used for amount conversion
      collateralDecimal = await this.collateralToken.decimals()
    })

    describe(`Deposit ${collateralName} into the ${poolName} pool`, function () {
      it(`Should deposit ${collateralName}`, async function () {
        const depositAmount = await deposit(10, user1)
        const depositAmount18 = convertTo18(depositAmount)
        return Promise.all([pool.totalSupply(), pool.totalValue(), pool.balanceOf(user1.address)]).then(function ([
          totalSupply,
          totalValue,
          vPoolBalance,
        ]) {
          expect(totalSupply).to.be.equal(depositAmount18, `Total supply of ${poolName} is wrong`)
          expect(totalValue).to.be.equal(depositAmount, `Total value of ${poolName} is wrong`)
          expect(vPoolBalance).to.be.equal(depositAmount18, `${poolName} balance of user is wrong`)
        })
      })
    })

    describe(`Withdraw ${collateralName} from ${poolName} pool`, function () {
      beforeEach(async function () {
        await deposit(20, user1)
      })

      it(`Should withdraw all ${collateralName} before rebalance`, async function () {
        const withdrawAmount = await pool.balanceOf(user1.address)
        await pool.connect(user1.signer).withdraw(withdrawAmount)
        const fee = await pool.withdrawFee()
        const feeToCollect = withdrawAmount.mul(fee).div(MAX_BPS)
        const totalDebtOfStrategies = await totalDebtOfAllStrategy(strategies, pool)
        return Promise.all([pool.totalDebt(), pool.totalSupply(), pool.balanceOf(user1.address)]).then(function ([
          totalDebt,
          totalSupply,
          vPoolBalance,
        ]) {
          expect(totalDebtOfStrategies).to.be.equal(totalDebt, `${collateralName} totalDebt of strategies is wrong`)
          expect(totalDebt).to.be.equal(0, `${collateralName} total debt of pool is wrong`)
          expect(totalSupply).to.be.equal(feeToCollect, `Total supply of ${poolName} is wrong`)
          expect(vPoolBalance).to.be.equal(0, `${poolName} balance of user is wrong`)
        })
      })

      it(`Should withdraw partial ${collateralName} before rebalance`, async function () {
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
  })
}

module.exports = {shouldDoSanityTest}
