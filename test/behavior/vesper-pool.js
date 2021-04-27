'use strict'

const swapper = require('../utils/tokenSwapper')
const {deposit: _deposit, rebalance, totalDebtOfAllStrategy, timeTravel, executeIfExist} = require('../utils/poolOps')
const {getPermitData} = require('../utils/signHelper')
const {MNEMONIC} = require('../utils/testkey')
const {expect} = require('chai')
const {BN, expectRevert} = require('@openzeppelin/test-helpers')
// const ERC20 = artifacts.require('ERC20')
const ERC20 = artifacts.require('ERC20')
const DECIMAL18 = new BN('1000000000000000000')
const MAX_BPS = new BN('10000')

async function shouldBehaveLikePool(poolName, collateralName) {
  let pool, strategies, collateralToken, collateralDecimal, feeCollector
  let user1, user2, user3

  async function deposit(amount, depositor) {
    return _deposit(pool, collateralToken, amount, depositor)
  }

  function convertTo18(amount) {
    const multiplier = DECIMAL18.div(new BN('10').pow(collateralDecimal))
    return new BN(amount).mul(multiplier).toString()
  }

  function convertFrom18(amount) {
    const divisor = DECIMAL18.div(new BN('10').pow(collateralDecimal))
    return new BN(amount).div(divisor).toString()
  }

  describe(`${poolName} basic operation tests`, function () {
    beforeEach(async function () {
      ;[, user1, user2, user3] = this.accounts
      // This setup helps in not typing 'this' all the time
      pool = this.pool
      strategies = this.strategies
      collateralToken = this.collateralToken
      // Decimal will be used for amount conversion
      collateralDecimal = await this.collateralToken.decimals.call()
    })

    describe(`Gasless approval for ${poolName} token`, function () {
      it('Should allow gasless approval using permit()', async function () {
        const amount = DECIMAL18.toString()
        const {owner, deadline, sign} = await getPermitData(pool, amount, MNEMONIC, user1)
        await pool.permit(owner, user1, amount, deadline, sign.v, sign.r, sign.s)
        const allowance = await pool.allowance(owner, user1)
        expect(allowance).to.be.bignumber.equal(amount, `${poolName} allowance is wrong`)
      })
    })

    describe(`Deposit ${collateralName} into the ${poolName} pool`, function () {
      it(`Should deposit ${collateralName}`, async function () {
        const depositAmount = (await deposit(10, user1)).toString()
        const depositAmount18 = convertTo18(depositAmount)
        return Promise.all([pool.totalSupply(), pool.totalValue(), pool.balanceOf(user1)]).then(function ([
          totalSupply,
          totalValue,
          vPoolBalance,
        ]) {
          expect(totalSupply).to.be.bignumber.equal(depositAmount18, `Total supply of ${poolName} is wrong`)
          expect(totalValue).to.be.bignumber.equal(depositAmount, `Total value of ${poolName} is wrong`)
          expect(vPoolBalance).to.be.bignumber.equal(depositAmount18, `${poolName} balance of user is wrong`)
        })
      })

      it(`Should deposit ${collateralName} and call rebalance() of each strategy`, async function () {
        const depositAmount = (await deposit(10, user2)).toString()
        const depositAmount18 = convertTo18(depositAmount)
        const totalDebtRatio = await pool.totalDebtRatio()
        const totalValue = await pool.totalValue()
        const maxDebt = totalValue.mul(totalDebtRatio).div(MAX_BPS)
        for (const strategy of strategies) {
          await executeIfExist(strategy.token.exchangeRateCurrent)
          await strategy.instance.rebalance()
          await executeIfExist(strategy.token.exchangeRateCurrent)
          const strategyParams = await pool.strategy(strategy.instance.address)
          if(strategyParams.debtRatio.gt(new BN('0'))) {
            const receiptToken = await strategy.token.balanceOf(strategy.instance.address)
            expect(receiptToken).to.be.bignumber.gt(new BN('0'), 'receipt token balance of strategy is wrong')
          }
        }
        const totalDebtOfStrategies = await totalDebtOfAllStrategy(strategies, pool)
        return Promise.all([pool.totalDebt(), pool.totalSupply(), pool.balanceOf(user2)]).then(function ([
          totalDebt,
          totalSupply,
          vPoolBalance,
        ]) {
          expect(totalDebt).to.be.bignumber.equal(maxDebt, `${collateralName} totalDebt of pool is wrong`)
          expect(totalDebtOfStrategies).to.be.bignumber.equal(
            totalDebt,
            `${collateralName} totalDebt of strategies is wrong`
          )
          expect(totalSupply).to.be.bignumber.equal(depositAmount18, `Total supply of ${poolName} is wrong`)
          expect(totalValue).to.be.bignumber.gte(depositAmount, `Total value of ${poolName} is wrong`)
          expect(vPoolBalance).to.be.bignumber.equal(depositAmount18, `${poolName} balance of user is wrong`)
        })
      })
    })

    describe(`Withdraw ${collateralName} from ${poolName} pool`, function () {
      let depositAmount
      beforeEach(async function () {
        depositAmount = await deposit(20, user1)
      })
      it(`Should withdraw all ${collateralName} before rebalance`, async function () {
        const withdrawAmount = await pool.balanceOf(user1)
        await pool.withdraw(withdrawAmount, {from: user1})
        const totalDebtOfStrategies = await totalDebtOfAllStrategy(strategies, pool)
        return Promise.all([
          pool.totalDebt(),
          pool.totalSupply(),
          pool.totalValue(),
          pool.balanceOf(user1),
          collateralToken.balanceOf(user1),
        ]).then(function ([totalDebt, totalSupply, totalValue, vPoolBalance, collateralBalance]) {
          expect(totalDebtOfStrategies).to.be.bignumber.equal(
            totalDebt,
            `${collateralName} totalDebt of strategies is wrong`
          )
          expect(totalDebt).to.be.bignumber.equal('0', `${collateralName} total debt of pool is wrong`)
          expect(totalSupply).to.be.bignumber.equal('0', `Total supply of ${poolName} is wrong`)
          expect(totalValue).to.be.bignumber.equal('0', `Total value of ${poolName} is wrong`)
          expect(vPoolBalance).to.be.bignumber.equal('0', `${poolName} balance of user is wrong`)
          expect(collateralBalance).to.be.bignumber.equal(depositAmount, `${collateralName} balance of user is wrong`)
        })
      })

      it(`Should withdraw partial ${collateralName} before rebalance`, async function () {
        let vPoolBalance = await pool.balanceOf(user1)
        const withdrawAmount = new BN(vPoolBalance).sub(new BN(convertTo18(100)))
        await pool.withdraw(withdrawAmount, {from: user1})
        vPoolBalance = (await pool.balanceOf(user1)).toString()
        const collateralBalance = (await collateralToken.balanceOf(user1)).toString()
        const totalDebt = await pool.totalDebt()
        const totalDebtOfStrategies = await totalDebtOfAllStrategy(strategies, pool)
        expect(totalDebtOfStrategies).to.be.bignumber.equal(
          totalDebt,
          `${collateralName} totalDebt of strategies is wrong`
        )
        expect(vPoolBalance).to.equal(convertTo18(100), `${poolName} balance of user is wrong`)
        expect(collateralBalance).to.equal(convertFrom18(withdrawAmount), `${collateralName} balance of user is wrong`)
      })

      it(`Should withdraw very small ${collateralName} after rebalance`, async function () {
        await rebalance(strategies)
        const collateralBalanceBefore = await collateralToken.balanceOf(user1)
        const withdrawAmount = '10000000000000000'
        await pool.withdraw(withdrawAmount, {from: user1})
        const collateralBalance = await collateralToken.balanceOf(user1)
        const totalDebt = await pool.totalDebt()
        const totalDebtOfStrategies = await totalDebtOfAllStrategy(strategies, pool)
        expect(totalDebtOfStrategies).to.be.bignumber.equal(
          totalDebt,
          `${collateralName} totalDebt of strategies is wrong`
        )
        expect(collateralBalance).to.be.bignumber.gt(collateralBalanceBefore, 'Withdraw failed')
      })

      it(`Should withdraw partial ${collateralName} after rebalance`, async function () {
        await rebalance(strategies)
        const collateralBalanceBefore = await collateralToken.balanceOf(user1)
        const withdrawAmount = (await pool.balanceOf(user1)).div(new BN(2))
        await pool.withdraw(withdrawAmount, {from: user1})
        const totalDebt = await pool.totalDebt()
        const totalDebtOfStrategies = await totalDebtOfAllStrategy(strategies, pool)
        expect(totalDebtOfStrategies).to.be.bignumber.equal(
          totalDebt,
          `${collateralName} totalDebt of strategies is wrong`
        )
        const collateralBalance = await collateralToken.balanceOf(user1)
        expect(collateralBalance).to.be.bignumber.gt(collateralBalanceBefore, 'Withdraw failed')
      })

      it(`Should withdraw all ${collateralName} after rebalance`, async function () {
        depositAmount = await deposit(10, user2)
        const dust = DECIMAL18.div(new BN('100')) // Dust is less than 1e16
        await rebalance(strategies)
        let o = await pool.balanceOf(user2)
        await pool.withdraw(o, {from: user2})
        o = await pool.balanceOf(user1)
        await pool.withdraw(o, {from: user1})
        return Promise.all([
          pool.totalDebt(),
          pool.totalSupply(),
          pool.totalValue(),
          pool.balanceOf(user1),
          collateralToken.balanceOf(user1),
        ]).then(function ([totalDebt, totalSupply, totalValue, vPoolBalance, collateralBalance]) {
          // Due to rounding some dust, 10000 wei, might left in case of Compound strategy
          expect(totalDebt).to.be.bignumber.lte(dust, `${collateralName} total debt is wrong`)
          expect(totalSupply).to.be.bignumber.equal('0', `Total supply of ${poolName} is wrong`)
          expect(totalValue).to.be.bignumber.lte(dust, `Total value of ${poolName} is wrong`)
          expect(vPoolBalance).to.be.bignumber.equal('0', `${poolName} balance of user is wrong`)
          expect(collateralBalance).to.be.bignumber.gte(depositAmount, `${collateralName} balance of user is wrong`)
        })
      })
    })

    describe(`Rebalance ${poolName} pool`, function () {
      it('Should rebalance multiple times.', async function () {
        const depositAmount = (await deposit(10, user3)).toString()
        await rebalance(strategies)
        let totalDebtRatio = await pool.totalDebtRatio()
        let totalValue = await pool.totalValue()
        let maxDebt = totalValue.mul(totalDebtRatio).div(MAX_BPS)
        const buffer = totalValue.sub(maxDebt)
        const tokensHere = await pool.tokensHere()
        expect(tokensHere).to.be.bignumber.equal(buffer, 'Tokens here is not correct')
        // Time travel 6 hours
        await timeTravel()
        await rebalance(strategies)

        await timeTravel()
        await rebalance(strategies)
        totalValue = await pool.totalValue()
        totalDebtRatio = await pool.totalDebtRatio()
        maxDebt = totalValue.mul(totalDebtRatio).div(MAX_BPS)
        await rebalance(strategies)
        return Promise.all([pool.totalDebt(), pool.totalSupply(), pool.balanceOf(user3)]).then(function ([
          totalDebt,
          totalSupply,
          vPoolBalance,
        ]) {
          expect(totalDebt).to.be.bignumber.eq(maxDebt, `${collateralName} total debt of pool is wrong`)
          expect(totalSupply).to.be.bignumber.gte(depositAmount, `Total supply of ${poolName} is wrong`)
          expect(vPoolBalance).to.be.bignumber.eq(convertTo18(depositAmount), `${poolName} balance of user is wrong`)
        })
      })
    })

    describe(`Price per share of ${poolName} pool`, function () {
      it('Should increase pool share value', async function () {
        await deposit(20, user1)
        const price1 = await pool.pricePerShare()
        await rebalance(strategies)
        // Time travel to generate earning
        await timeTravel(5 * 60 * 60, 50)
        await deposit(20, user2)
        await rebalance(strategies)
        const price2 = await pool.pricePerShare()
        expect(price2).to.be.bignumber.gt(price1, `${poolName} share value should increase`)
        // Time travel to generate earning
        await timeTravel()
        await deposit(20, user3)
        await timeTravel()
        await rebalance(strategies)
        const price3 = await pool.pricePerShare()
        expect(price3).to.be.bignumber.gt(price2, `${poolName} share value should increase`)
      })
    })

    describe(`Withdraw fee in ${poolName} pool`, function () {
      let depositAmount
      const fee = new BN('2000') // 20%
      beforeEach(async function () {
        depositAmount = await deposit(10, user2)
        feeCollector = this.feeCollector
        await pool.updateWithdrawFee(fee)
      })
      it('Should collect fee on withdraw', async function () {
        await pool.withdraw(depositAmount, {from: user2})
        const feeToCollect = depositAmount.mul(fee).div(MAX_BPS)
        const vPoolBalanceFC = await pool.balanceOf(feeCollector)
        expect(vPoolBalanceFC).to.be.bignumber.eq(feeToCollect, 'Withdraw fee transfer failed')
      })

      it('Should collect fee on withdraw after rebalance', async function () {
        await rebalance(strategies)
        await pool.withdraw(depositAmount, {from: user2})
        const vPoolBalanceFC = await pool.balanceOf(feeCollector)
        expect(vPoolBalanceFC).to.be.bignumber.gt('0', 'Withdraw fee transfer failed')
      })

      it('Should not allow user to withdraw without fee', async function () {
        await rebalance(strategies)
        const withdrawAmount = await pool.balanceOf(user2)
        const tx = pool.withdrawByStrategy(withdrawAmount, {from: user2})
        await expectRevert(tx, 'Not a white listed address')
      })

      it('Should allow fee collector to withdraw without fee', async function () {
        await rebalance(strategies)
        const withdrawAmount = await pool.balanceOf(user2)
        await pool.withdraw(withdrawAmount, {from: user2})
        // Add fee collector to fee white list
        const target = await pool.feeWhiteList()
        await pool.addInList(target, feeCollector)
        const feeCollected = await pool.balanceOf(feeCollector)
        await pool.withdrawByStrategy(feeCollected, {from: feeCollector})
        const vPoolBalanceFC = await pool.balanceOf(feeCollector)
        expect(vPoolBalanceFC).to.be.bignumber.eq('0', `${poolName} balance of FC is not correct`)
        const collateralBalance = await collateralToken.balanceOf(feeCollector)
        expect(collateralBalance).to.be.bignumber.gt('0', `${collateralName} balance of FC is not correct`)
      })
    })

    describe(`Interest fee in ${poolName} pool`, function () {
      beforeEach(async function () {
        await deposit(20, user1)
      })
      it('Should earn interest fee on rebalance', async function () {
        await rebalance(strategies)
        const fc = await strategies[0].feeCollector
        await timeTravel()
        // Another deposit
        await deposit(200, user2)
        await rebalance(strategies)
        await strategies[0].instance.sweepERC20(pool.address)
        const feeEarned1 = await pool.balanceOf(fc)
        expect(feeEarned1).to.be.bignumber.gt(new BN('0'), 'Fee collected is not correct')
        await timeTravel()
        await rebalance(strategies)
        await strategies[0].instance.sweepERC20(pool.address)
        const feeEarned2 = await pool.balanceOf(fc)
        expect(feeEarned2).to.be.bignumber.gt(feeEarned1, 'Fee collected is not correct')
      })

      it('Should rebalance when interest fee is zero', async function () {
        await pool.updateInterestFee(strategies[0].instance.address, '0')
        await rebalance(strategies)
        // Time travel to generate earning
        await timeTravel()
        await deposit(200, user2)
        await rebalance(strategies)
        const fc = strategies[0].instance.address
        let vPoolBalanceFC = await pool.balanceOf(fc)
        expect(vPoolBalanceFC.toString()).to.eq('0', 'Collected fee should be zero')
        // Another time travel and rebalance to run scenario again
        await timeTravel()
        await rebalance(strategies)
        await strategies[0].instance.sweepERC20(pool.address)
        vPoolBalanceFC = await pool.balanceOf(fc)
        expect(vPoolBalanceFC.toString()).to.eq('0', 'Collected fee should be zero')
      })
    })

    describe(`Sweep ERC20 token in ${poolName} pool`, function () {
      it(`Should sweep ERC20 for ${collateralName}`, async function () {
        const metAddress = '0xa3d58c4e56fedcae3a7c43a725aee9a71f0ece4e'
        const MET = await ERC20.at(metAddress)
        await deposit(200, user2)
        await swapper.swapEthForToken(2, metAddress, user1, pool.address)
        await pool.sweepERC20(metAddress)
        const fc = await pool.feeCollector()
        return Promise.all([
          pool.totalSupply(),
          pool.totalValue(),
          MET.balanceOf(pool.address),
          MET.balanceOf(fc),
        ]).then(function ([totalSupply, totalValue, metBalance, metBalanceFC]) {
          expect(totalSupply).to.be.bignumber.gt(new BN('0'), `Total supply of ${poolName} is wrong`)
          expect(totalValue).to.be.bignumber.gt(new BN('0'), `Total value of ${poolName} is wrong`)
          expect(metBalance).to.be.bignumber.eq(new BN('0'), 'ERC20 token balance of pool is wrong')
          expect(metBalanceFC).to.be.bignumber.gt(new BN('0'), 'ERC20 token balance of pool is wrong')
        })
      })

      it('Should not be able sweep reserved token', async function () {
        const tx = pool.sweepERC20(collateralToken.address)
        await expectRevert(tx, 'not-allowed-to-sweep')
      })
    })

    describe(`${poolName}: Should report earning correctly`, function () {
      it('Should not be able to payback more than total debt', async function () {})

      it('Strategy should receive more amount when new deposit happen', async function () {
        await deposit(200, user2)
        await rebalance(strategies)
        let strategyParams = await pool.strategy(strategies[0].instance.address)
        const totalDebtBefore = strategyParams.totalDebt
        await deposit(200, user2)
        await rebalance(strategies)
        strategyParams = await pool.strategy(strategies[0].instance.address)
        const totalDebtAfter = strategyParams.totalDebt
        expect(totalDebtAfter).to.be.bignumber.gt(totalDebtBefore, `Total debt of strategy in ${poolName} is wrong`)
      })

      it('Strategy should not receive new amount if current debt of pool > max debt', async function () {
        await Promise.all([deposit(200, user1), deposit(200, user2)])
        await rebalance(strategies)
        let [totalDebtRatio, totalValue, totalDebtBefore] = await Promise.all([
          pool.totalDebtRatio(),
          pool.totalValue(),
          pool.totalDebt(),
        ])
        let maxDebt = totalValue.mul(totalDebtRatio).div(MAX_BPS)
        expect(maxDebt).to.be.bignumber.eq(totalDebtBefore, `Total debt of ${poolName} is wrong after rebalance`)
        const totalDebtOfStrategies = await totalDebtOfAllStrategy(strategies, pool)
        expect(maxDebt).to.be.bignumber.eq(
          totalDebtOfStrategies,
          'Total debt of all strategies is wrong after rebalance'
        )
        const withdrawAmount = await pool.balanceOf(user1)
        await pool.withdraw(withdrawAmount, {from: user1})
        let totalDebtAfter = await pool.totalDebt()
        totalValue = await pool.totalValue()
        maxDebt = totalValue.mul(totalDebtRatio).div(MAX_BPS)
        expect(maxDebt).to.be.bignumber.lt(totalDebtAfter, `Total debt of ${poolName} is wrong after withdraw`)
        expect(totalDebtAfter).to.be.bignumber.lt(totalDebtBefore, `Total debt of ${poolName} is wrong after withdraw`)
        await rebalance(strategies)
        totalDebtAfter = await pool.totalDebt()
        expect(maxDebt).to.be.bignumber.eq(
          totalDebtAfter,
          `Total debt of ${poolName} is wrong after withdraw and rebalance`
        )
      })

      it('Pool decrease total debt when strategy payback', async function () {
        // TODO:
      })

      it('Pool record correct value of profit and loss', async function () {
        await deposit(200, user2)
        await rebalance(strategies)
        await timeTravel()
        await rebalance(strategies)
        const strategyParams = await pool.strategy(strategies[0].instance.address)
        const totalProfit = strategyParams.totalProfit
        expect(totalProfit).to.be.bignumber.gt(new BN('0'), `Total debt of strategy in ${poolName} is wrong`)
      })
    })

    describe(`${poolName}: Available credit line`, function () {
      it('Should return 0 credit line when pool is shutdown', async function () {
        await deposit(200, user2)
        await rebalance(strategies)
        await deposit(200, user1)
        let creditLimit = await pool.availableCreditLimit(strategies[0].instance.address)
        expect(creditLimit).to.be.bignumber.gt(new BN('0'), `Credit limit of strategy in ${poolName} is wrong`)
        await pool.shutdown()
        creditLimit = await pool.availableCreditLimit(strategies[0].instance.address)
        expect(creditLimit).to.be.bignumber.eq(new BN('0'), `Credit limit of strategy in ${poolName} is wrong`)
      })

      it('Should return 0 credit line  when current debt > max debt', async function () {
        await deposit(200, user2)
        await rebalance(strategies)
        await deposit(200, user1)
        const withdrawAmount = await pool.balanceOf(user2)
        await pool.withdraw(withdrawAmount, {from: user2})
        const creditLimit = await pool.availableCreditLimit(strategies[0].instance.address)
        expect(creditLimit).to.be.bignumber.eq(new BN('0'), `Credit limit of strategy in ${poolName} is wrong`)
      })

      it('Credit line should be > 0 when new deposit receive', async function () {
        await deposit(200, user2)
        await rebalance(strategies)
        await deposit(200, user1)
        const creditLimit = await pool.availableCreditLimit(strategies[0].instance.address)
        expect(creditLimit).to.be.bignumber.gt(new BN('0'), `Credit limit of strategy in ${poolName} is wrong`)
      })

      it('Credit line should should be min of tokens here, available limit', async function () {
        // TODO:
      })

      it('Strategy should not receive more than available limit in one rebalance', async function () {
        // TODO:
      })

      it('Pool take profit from strategy if current debt of pool > max debt', async function () {
        // TODO:
      })
    })
  })
}

module.exports = {shouldBehaveLikePool}
