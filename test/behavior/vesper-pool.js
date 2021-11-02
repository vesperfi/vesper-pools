'use strict'

const swapper = require('../utils/tokenSwapper')
const {getPermitData} = require('../utils/signHelper')
const {MNEMONIC} = require('../utils/testkey')
const {
  deposit: _deposit,
  rebalance,
  rebalanceStrategy,
  totalDebtOfAllStrategy,
  timeTravel,
  executeIfExist,
  reset,
} = require('../utils/poolOps')
const chaiAlmost = require('chai-almost')
const chai = require('chai')
chai.use(chaiAlmost(1))
const expect = chai.expect
const {BigNumber: BN} = require('ethers')
const {ethers} = require('hardhat')
const DECIMAL18 = BN.from('1000000000000000000')
const MAX_BPS = BN.from('10000')
async function shouldBehaveLikePool(poolName, collateralName) {
  let pool, strategies, collateralToken, collateralDecimal, feeCollector, accountant
  let user1, user2, user3, user4

  async function deposit(amount, depositor) {
    return _deposit(pool, collateralToken, amount, depositor)
  }

  function convertTo18(amount) {
    const multiplier = DECIMAL18.div(BN.from(10).pow(collateralDecimal))
    return BN.from(amount).mul(multiplier)
  }

  function convertFrom18(amount) {
    const divisor = DECIMAL18.div(BN.from(10).pow(collateralDecimal))
    return BN.from(amount).div(divisor)
  }

  describe(`${poolName} basic operation tests`, function () {
    beforeEach(async function () {
      ;[, user1, user2, user3, user4] = this.users
      // This setup helps in not typing 'this' all the time
      pool = this.pool
      accountant = this.accountant
      strategies = this.strategies
      collateralToken = this.collateralToken
      // Decimal will be used for amount conversion
      collateralDecimal = await this.collateralToken.decimals()
    })

    describe(`Gasless approval for ${poolName} token`, function () {
      it('Should allow gasless approval using permit()', async function () {
        const amount = DECIMAL18.toString()
        const {owner, deadline, sign} = await getPermitData(pool, amount, MNEMONIC, user1.address)
        await pool.permit(owner, user1.address, amount, deadline, sign.v, sign.r, sign.s)
        const allowance = await pool.allowance(owner, user1.address)
        expect(allowance).to.be.equal(amount, `${poolName} allowance is wrong`)
      })
    })

    describe(`Deposit ${collateralName} into the ${poolName} pool`, function () {
      after(reset)
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

      it(`Should deposit ${collateralName} and call rebalance() of each strategy`, async function () {
        const depositAmount = await deposit(50, user4)
        const depositAmount18 = convertTo18(depositAmount)
        const totalValue = await pool.totalValue()
        for (const strategy of strategies) {
          await executeIfExist(strategy.token.exchangeRateCurrent)
          await rebalanceStrategy(strategy)
          await executeIfExist(strategy.token.exchangeRateCurrent)
          const strategyParams = await pool.strategy(strategy.instance.address)
          if (strategyParams._debtRatio.gt(0)) {
            const receiptTokenBalance = await strategy.token.balanceOf(strategy.instance.address)
            expect(receiptTokenBalance).to.be.gt(0, 'receipt token balance of strategy is wrong')
          }
        }
        const totalDebtOfStrategies = await totalDebtOfAllStrategy(strategies, pool)
        return Promise.all([pool.totalDebt(), pool.totalSupply(), pool.balanceOf(user4.address)]).then(function ([
          totalDebt,
          totalSupply,
          vPoolBalance,
        ]) {
          expect(totalDebtOfStrategies).to.be.equal(totalDebt, `${collateralName} totalDebt of strategies is wrong`)
          expect(totalSupply).to.be.equal(depositAmount18, `Total supply of ${poolName} is wrong`)
          expect(totalValue).to.be.gte(depositAmount, `Total value of ${poolName} is wrong`)
          expect(vPoolBalance).to.be.equal(depositAmount18, `${poolName} balance of user is wrong`)
        })
      })
    })

    describe(`Withdraw ${collateralName} from ${poolName} pool`, function () {
      let depositAmount
      beforeEach(async function () {
        depositAmount = await deposit(20, user1)
      })
      after(reset)

      it(`Should withdraw all ${collateralName} before rebalance`, async function () {
        const withdrawAmount = await pool.balanceOf(user1.address)
        await pool.connect(user1.signer).withdraw(withdrawAmount)
        const totalDebtOfStrategies = await totalDebtOfAllStrategy(strategies, pool)
        return Promise.all([
          pool.totalDebt(),
          pool.totalSupply(),
          pool.totalValue(),
          pool.balanceOf(user1.address),
          collateralToken.balanceOf(user1.address),
        ]).then(function ([totalDebt, totalSupply, totalValue, vPoolBalance, collateralBalance]) {
          expect(totalDebtOfStrategies).to.be.equal(totalDebt, `${collateralName} totalDebt of strategies is wrong`)
          expect(totalDebt).to.be.equal(0, `${collateralName} total debt of pool is wrong`)
          expect(totalSupply).to.be.equal(0, `Total supply of ${poolName} is wrong`)
          expect(totalValue).to.be.equal(0, `Total value of ${poolName} is wrong`)
          expect(vPoolBalance).to.be.equal(0, `${poolName} balance of user is wrong`)
          expect(collateralBalance).to.be.equal(depositAmount, `${collateralName} balance of user is wrong`)
        })
      })

      it(`Should withdraw partial ${collateralName} before rebalance`, async function () {
        let vPoolBalance = await pool.balanceOf(user1.address)
        const withdrawAmount = vPoolBalance.sub(convertTo18(100))
        await pool.connect(user1.signer).withdraw(withdrawAmount)
        vPoolBalance = (await pool.balanceOf(user1.address)).toString()
        const collateralBalance = (await collateralToken.balanceOf(user1.address)).toString()
        const totalDebt = await pool.totalDebt()
        const totalDebtOfStrategies = await totalDebtOfAllStrategy(strategies, pool)
        expect(totalDebtOfStrategies).to.be.equal(totalDebt, `${collateralName} totalDebt of strategies is wrong`)
        expect(vPoolBalance).to.equal(convertTo18(100), `${poolName} balance of user is wrong`)
        expect(collateralBalance).to.equal(convertFrom18(withdrawAmount), `${collateralName} balance of user is wrong`)
      })

      it(`Should withdraw very small ${collateralName} after rebalance`, async function () {
        await rebalance(strategies)
        const collateralBalanceBefore = await collateralToken.balanceOf(user1.address)
        const withdrawAmount = '10000000000000000'
        await pool.connect(user1.signer).withdraw(withdrawAmount)
        const collateralBalance = await collateralToken.balanceOf(user1.address)
        const totalDebt = await pool.totalDebt()
        const totalDebtOfStrategies = await totalDebtOfAllStrategy(strategies, pool)
        expect(totalDebtOfStrategies).to.be.equal(totalDebt, `${collateralName} totalDebt of strategies is wrong`)
        expect(collateralBalance).to.be.gt(collateralBalanceBefore, 'Withdraw failed')
      })

      it(`Should withdraw partial ${collateralName} after rebalance`, async function () {
        await rebalance(strategies)
        const collateralBalanceBefore = await collateralToken.balanceOf(user1.address)
        const withdrawAmount = (await pool.balanceOf(user1.address)).div(BN.from(2))
        await pool.connect(user1.signer).withdraw(withdrawAmount)
        const totalDebt = await pool.totalDebt()
        const totalDebtOfStrategies = await totalDebtOfAllStrategy(strategies, pool)
        expect(totalDebtOfStrategies).to.be.equal(totalDebt, `${collateralName} totalDebt of strategies is wrong`)
        const collateralBalance = await collateralToken.balanceOf(user1.address)
        expect(collateralBalance).to.be.gt(collateralBalanceBefore, 'Withdraw failed')
      })

      it(`Should withdraw all ${collateralName} after rebalance`, async function () {
        // reset interest fee to 0.
        for (const strategy of strategies) {
          await accountant.updateInterestFee(strategy.instance.address, '0')
        }
        depositAmount = await deposit(10, user2)
        const dust = DECIMAL18.div(BN.from(100)) // Dust is less than 1e16
        await rebalance(strategies)
        // Some strategies can report a loss if they don't have time to earn anything
        // Time travel based on type of strategy. For compound strategy mine 500 blocks, else time travel
        await timeTravel(60 * 24 * 60 * 60, 500, '', '', strategies)
        await rebalance(strategies)

        let o = await pool.balanceOf(user1.address)
        await pool.connect(user1.signer).withdraw(o)
        await rebalance(strategies)
        o = await pool.balanceOf(user2.address)
        await pool.connect(user2.signer).withdraw(o)

        return Promise.all([
          pool.totalDebt(),
          pool.totalSupply(),
          pool.totalValue(),
          pool.balanceOf(user2.address),
          collateralToken.balanceOf(user1.address),
        ]).then(function ([totalDebt, totalSupply, totalValue, vPoolBalance, collateralBalance]) {
          // Due to rounding some dust, 10000 wei, might left in case of Compound and Yearn strategy
          expect(totalDebt).to.be.lte(dust, `${collateralName} total debt is wrong`)
          expect(totalSupply).to.be.lte(dust, `Total supply of ${poolName} is wrong`)
          expect(totalValue).to.be.lte(dust, `Total value of ${poolName} is wrong`)
          expect(vPoolBalance).to.be.lte(dust, `${poolName} balance of user is wrong`)
          expect(collateralBalance).to.be.gte(depositAmount, `${collateralName} balance of user is wrong`)
        })
      })
    })

    describe(`Multi transfer ${poolName} pool tokens`, function () {
      it('Should transfer to multiple recipients', async function () {
        await deposit(100, user1)
        const balanceBefore = await pool.balanceOf(user4.address)
        expect(balanceBefore).to.be.equal(0, `${collateralName} balance should be 0`)
        await pool
          .connect(user1.signer)
          .multiTransfer([user3.address, user4.address], [DECIMAL18.mul(BN.from(1)), DECIMAL18.mul(BN.from(2))])
        return Promise.all([pool.balanceOf(user3.address), pool.balanceOf(user4.address)]).then(function ([
          balance1,
          balance2,
        ]) {
          expect(balance1).to.be.equal(balance1, `${collateralName} balance is wrong`)
          expect(balance2).to.be.equal(balance2, `${collateralName} balance is wrong`)
        })
      })

      it('Should have same size for recipients and amounts', async function () {
        await deposit(10, user1)
        const tx = pool.connect(user1.signer).multiTransfer([user3.address, user4.address], [DECIMAL18.mul(BN.from(1))])
        await expect(tx).to.be.revertedWith('4')
      })
    })

    describe(`Rebalance ${poolName} pool`, function () {
      after(reset)

      it('Should rebalance multiple times.', async function () {
        const depositAmount = (await deposit(10, user3)).toString()
        await rebalance(strategies)
        let totalDebtRatio = await pool.totalDebtRatio()
        let totalValue = await pool.totalValue()
        let maxDebt = totalValue.mul(totalDebtRatio).div(MAX_BPS)

        // The following will always fail for CRV strategies
        if (!strategies[0].type.includes('curve')) {
          const buffer = totalValue.sub(maxDebt)
          const tokensHere = await pool.tokensHere()
          expect(tokensHere.sub(buffer).toNumber()).to.almost.equal(0, 'Tokens here is not correct')
        }

        // Time travel 6 hours
        await timeTravel()
        await rebalance(strategies)
        totalValue = await pool.totalValue()
        totalDebtRatio = await pool.totalDebtRatio()
        maxDebt = totalValue.mul(totalDebtRatio).div(MAX_BPS)
        let unusedCredit = BN.from('0')
        for (const strategy of strategies) {
          const credit = await pool.availableCreditLimit(strategy.instance.address)
          unusedCredit = unusedCredit.add(credit)
        }
        return Promise.all([pool.totalDebt(), pool.totalSupply(), pool.balanceOf(user3.address)]).then(function ([
          totalDebt,
          totalSupply,
          vPoolBalance,
        ]) {
          expect(maxDebt.sub(unusedCredit).sub(totalDebt).toNumber()).to.almost.eq(
            0,
            `${collateralName} total debt of pool is wrong`
          )
          expect(totalSupply).to.be.gte(depositAmount, `Total supply of ${poolName} is wrong`)
          expect(vPoolBalance).to.be.eq(convertTo18(depositAmount), `${poolName} balance of user is wrong`)
        })
      })

      it('Should update strategy lastRebalance param', async function () {
        // given
        const [strategyToRebalance] = strategies
        const {_lastRebalance: lastRebalanceBefore} = await pool.strategy(strategyToRebalance.instance.address)

        // when
        await timeTravel()
        await rebalance([strategyToRebalance])

        // then
        const {_lastRebalance: lastRebalanceAfter} = await pool.strategy(strategyToRebalance.instance.address)
        expect(lastRebalanceAfter).to.gt(lastRebalanceBefore)
      })
    })

    describe(`Price per share of ${poolName} pool`, function () {
      it('Should increase pool value', async function () {
        await deposit(20, user1)
        const value1 = await pool.totalValue()
        await rebalance(strategies)
        // Time travel to generate earning
        await timeTravel(30 * 24 * 60 * 60)
        await rebalance(strategies)
        await rebalance(strategies)
        const value2 = await pool.totalValue()
        expect(value2).to.be.gt(value1, `${poolName} Pool value should increase`)
        // Time travel to generate earning
        await timeTravel(30 * 24 * 60 * 60)
        await deposit(20, user3)
        await timeTravel(30 * 24 * 60 * 60)
        await rebalance(strategies)
        const value3 = await pool.totalValue()
        expect(value3).to.be.gt(value2, `${poolName} Pool value should increase`)
      })
    })

    describe(`Withdraw fee in ${poolName} pool`, function () {
      const fee = BN.from(2000) // 20%
      beforeEach(async function () {
        await deposit(10, user2)
        feeCollector = this.feeCollector
        await pool.updateWithdrawFee(fee)
        // Add fee collector to fee white list
        const target = await pool.feeWhitelist()
        await pool.addInList(target, feeCollector)
      })
      after(reset)

      it('Should collect fee on withdraw', async function () {
        const withdrawAmount = await pool.balanceOf(user2.address)
        await pool.connect(user2.signer).withdraw(withdrawAmount)
        const feeToCollect = withdrawAmount.mul(fee).div(MAX_BPS)
        const vPoolBalanceFC = await pool.balanceOf(feeCollector)
        expect(vPoolBalanceFC).to.be.equal(feeToCollect, 'Withdraw fee transfer failed')
      })

      it('Should collect fee on withdraw after rebalance', async function () {
        await rebalance(strategies)
        const withdrawAmount = await pool.balanceOf(user2.address)
        await pool.connect(user2.signer).withdraw(withdrawAmount)
        const vPoolBalanceFC = await pool.balanceOf(feeCollector)
        expect(vPoolBalanceFC).to.be.gt('0', 'Withdraw fee transfer failed')
      })

      it('Should not allow user to withdraw without fee', async function () {
        await rebalance(strategies)
        const withdrawAmount = await pool.balanceOf(user2.address)
        const tx = pool.connect(user2.signer).whitelistedWithdraw(withdrawAmount)
        await expect(tx).to.be.revertedWith('5')
      })

      it('Should allow fee collector to withdraw without fee', async function () {
        const dust = DECIMAL18.div(BN.from(100)) // Dust is less than 1e16
        await deposit(10, user1)
        await deposit(10, user2)
        await rebalance(strategies)
        const withdrawAmount = await pool.balanceOf(user2.address)
        await pool.connect(user2.signer).withdraw(withdrawAmount)
        const feeCollected = await pool.balanceOf(feeCollector)
        const signer = await ethers.getSigner(feeCollector)
        await pool.connect(signer).whitelistedWithdraw(feeCollected)

        const vPoolBalanceFC = await pool.balanceOf(feeCollector)
        // Due to rounding some dust, 10000 wei, might left in case of Yearn strategy
        expect(vPoolBalanceFC).to.be.lte(dust, `${poolName} balance of FC is not correct`)

        const collateralBalance = await collateralToken.balanceOf(feeCollector)
        expect(collateralBalance).to.be.gt('0', `${collateralName} balance of FC is not correct`)
      })
    })

    describe(`Interest fee in ${poolName} pool`, function () {
      beforeEach(async function () {
        await deposit(20, user1)
      })
      after(reset)

      it('Should earn interest fee on rebalance', async function () {
        await rebalance(strategies)
        const fc = await strategies[0].feeCollector
        await timeTravel()
        // Another deposit
        await deposit(20, user2)
        await rebalance(strategies)
        const feeEarned1 = await pool.balanceOf(fc)
        expect(feeEarned1).to.be.gt(0, 'Fee collected is not correct')
        await timeTravel()
        await rebalance(strategies)
        const feeEarned2 = await pool.balanceOf(fc)
        expect(feeEarned2).to.be.gt(feeEarned1, 'Fee collected is not correct')
      })

      it('Should rebalance when interest fee is zero', async function () {
        await accountant.updateInterestFee(strategies[0].instance.address, '0')
        await rebalance(strategies)
        // Time travel to generate earning
        await timeTravel()
        await deposit(50, user2)
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
      after(reset)
      it(`Should sweep ERC20 for ${collateralName}`, async function () {
        let ANY_ERC20 = require('../../helper/ethereum/address').ANY_ERC20
        if (process.env.CHAIN === 'polygon') {
          ANY_ERC20 = require('../../helper/polygon/address').ANY_ERC20
        }
        const MET = await ethers.getContractAt('ERC20', ANY_ERC20)
        await deposit(60, user2)
        await swapper.swapEthForToken(2, ANY_ERC20, user1, pool.address)
        await pool.sweepERC20(ANY_ERC20)
        const fc = await pool.feeCollector()
        return Promise.all([
          pool.totalSupply(),
          pool.totalValue(),
          MET.balanceOf(pool.address),
          MET.balanceOf(fc),
        ]).then(function ([totalSupply, totalValue, metBalance, metBalanceFC]) {
          expect(totalSupply).to.be.gt(0, `Total supply of ${poolName} is wrong`)
          expect(totalValue).to.be.gt(0, `Total value of ${poolName} is wrong`)
          expect(metBalance).to.be.eq(0, 'ERC20 token balance of pool is wrong')
          expect(metBalanceFC).to.be.gt(0, 'ERC20 token balance of pool is wrong')
        })
      })

      it('Should not be able sweep reserved token', async function () {
        const tx = pool.sweepERC20(collateralToken.address)
        await expect(tx).to.be.revertedWith('8')
      })
    })

    describe(`${poolName}: Should report earning correctly`, function () {
      after(reset)
      
      it('Strategy should receive more amount when new deposit happen', async function () {
        await deposit(75, user2)
        await rebalance(strategies)
        const totalDebtBefore = await pool.totalDebtOf(strategies[0].instance.address)
        await deposit(50, user2)
        await rebalance(strategies)
        const totalDebtAfter = await pool.totalDebtOf(strategies[0].instance.address)
        expect(totalDebtAfter).to.be.gt(totalDebtBefore, `Total debt of strategy in ${poolName} is wrong`)
      })

      it('Strategy should not receive new amount if current debt of pool > max debt', async function () {
        await Promise.all([deposit(50, user1), deposit(60, user2)])
        await rebalance(strategies)

        let [totalDebtRatio, totalValue, totalDebtBefore] = await Promise.all([
          pool.totalDebtRatio(),
          pool.totalValue(),
          pool.totalDebt(),
        ])
        // Curve takes a loss initially, so we need to look for any excess debt to curve strats
        let excessDebt = ethers.BigNumber.from(0)
        for (let i = 0; i < strategies.length; i++) {
          if (strategies[i].type.includes('curve')) {
            const p = await pool.excessDebt(strategies[i].instance.address)
            excessDebt = excessDebt.add(p)
          }
        }
        let maxTotalDebt = totalValue.mul(totalDebtRatio).div(MAX_BPS)

        expect(Math.abs(maxTotalDebt.add(excessDebt).sub(totalDebtBefore))).to.almost.equal(
          1,
          `Total debt of ${poolName} is wrong after rebalance`
        )
        const totalDebtOfStrategies = await totalDebtOfAllStrategy(strategies, pool)
        expect(Math.abs(maxTotalDebt.add(excessDebt).sub(totalDebtOfStrategies))).to.almost.equal(
          1,
          'Total debt of all strategies is wrong after rebalance'
        )
        const withdrawAmount = await pool.balanceOf(user1.address)
        await pool.connect(user1.signer).withdraw(withdrawAmount)
        totalValue = await pool.totalValue()
        maxTotalDebt = totalValue.mul(totalDebtRatio).div(MAX_BPS)
        let totalDebtAfter = await pool.totalDebt()
        expect(totalDebtAfter).to.be.gte(maxTotalDebt, `Total debt of ${poolName} is wrong after withdraw`)
        expect(totalDebtAfter).to.be.lt(totalDebtBefore, `Total debt of ${poolName} is wrong after withdraw`)
        await rebalance(strategies)
        totalDebtAfter = await pool.totalDebt()
        expect(totalDebtAfter).to.be.lte(
          maxTotalDebt,
          `Total debt of ${poolName} is wrong after withdraw and rebalance`
        )
      })

      it('Pool record correct value of profit and loss', async function () {
        await deposit(70, user2)
        await rebalance(strategies)
        await timeTravel(50)
        await rebalance(strategies)
        const strategyParams = await pool.strategy(strategies[0].instance.address)
        const totalProfit = strategyParams._totalProfit
        expect(totalProfit).to.be.gt(0, `Total debt of strategy in ${poolName} is wrong`)
      })
    })

    describe(`${poolName}: Available credit line`, function () {
      afterEach(reset)

      it('Should return 0 credit line when pool is shutdown', async function () {
        await deposit(50, user2)
        await rebalance(strategies)
        await deposit(55, user1)
        let creditLimit = await pool.availableCreditLimit(strategies[0].instance.address)
        expect(creditLimit).to.be.gt(0, `Credit limit of strategy in ${poolName} is wrong`)
        await pool.shutdown()
        creditLimit = await pool.availableCreditLimit(strategies[0].instance.address)
        expect(creditLimit).to.be.eq(0, `Credit limit of strategy in ${poolName} is wrong`)
      })

      it('Should return 0 credit line  when current debt > max debt', async function () {
        await deposit(100, user2)
        await rebalance(strategies)
        await deposit(100, user1)
        const withdrawAmount = await pool.balanceOf(user2.address)
        await pool.connect(user2.signer).withdraw(withdrawAmount)
        const creditLimit = await pool.availableCreditLimit(strategies[0].instance.address)
        expect(creditLimit).to.be.eq(0, `Credit limit of strategy in ${poolName} is wrong`)
      })

      it('Credit line should be > 0 when new deposit receive', async function () {
        await deposit(65, user2)
        await rebalance(strategies)
        await deposit(50, user1)
        const creditLimit = await pool.availableCreditLimit(strategies[0].instance.address)
        expect(creditLimit).to.be.gt(0, `Credit limit of strategy in ${poolName} is wrong`)
      })

      it('Credit line should be min of debtRate, tokens here', async function () {
        const dust = DECIMAL18.div(BN.from(100)) // Dust is less than 1e16
        await deposit(60, user2)
        await rebalance(strategies)
        await deposit(40, user1)
        await accountant.updateDebtRate(strategies[0].instance.address, 20000)
        const strategyParams = await pool.strategy(strategies[0].instance.address)
        const blockNumber = await ethers.provider.getBlockNumber()
        let expectedLimit = BN.from(blockNumber).sub(strategyParams._lastRebalance).mul(strategyParams._debtRate)
        const creditLimit = await pool.availableCreditLimit(strategies[0].instance.address)
        expect(creditLimit).to.almost.equal(expectedLimit, `Credit limit of strategy in ${poolName} is wrong`)
        const debtBefore = strategyParams._totalDebt
        await strategies[0].instance.rebalance()
        // add limit of one more block
        expectedLimit = expectedLimit.add(strategyParams._debtRate)
        const debtAfter = await pool.totalDebtOf(strategies[0].instance.address)
        // Due to rounding some dust, 10000 wei, might left in case of Yearn strategy
        expect(Math.abs(debtAfter.sub(debtBefore).sub(expectedLimit))).to.lte(
          dust,
          `Debt of strategy in ${poolName} is wrong`
        )
      })
    })
  })
}

module.exports = {shouldBehaveLikePool}
