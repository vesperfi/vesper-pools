'use strict'

const swapper = require('../utils/tokenSwapper')
const { getPermitData } = require('../utils/signHelper')
const { MNEMONIC } = require('../utils/testKey')
const { getEvent, unlock, getIfExist } = require('../utils/setupHelper')
const {
  deposit: _deposit,
  rebalance,
  rebalanceStrategy,
  totalDebtOfAllStrategy,
  timeTravel,
  makeStrategyProfitable,
} = require('../utils/poolOps')
const chaiAlmost = require('chai-almost')
const chai = require('chai')
chai.use(chaiAlmost(1))
const expect = chai.expect
const { BigNumber: BN } = require('ethers')
const { ethers } = require('hardhat')
const { advanceBlock, increase } = require('../utils/time')
const { getChain } = require('../utils/chains')
const StrategyType = require('../utils/strategyTypes')
const { adjustBalance } = require('../utils/balance')
const { ANY_ERC20, NATIVE_TOKEN, FRAX, Vesper } = require(`../../helper/${getChain()}/address`)

const DECIMAL18 = ethers.utils.parseEther('1')
const MAX_BPS = BN.from('10000')
// Skipping some tests for collateral tokens due to low liquidity at forked block
const SKIP_TEST_COLLATERAL_TOKENS = [FRAX]
async function shouldBehaveLikePool(poolName, collateralName, isEarnPool = false) {
  let pool, strategies, collateralToken, collateralDecimal, accountant
  let user1, user2, user3, user4

  async function deposit(amount, depositor) {
    return _deposit(pool, collateralToken, amount, depositor)
  }

  function convertFrom18(amount) {
    const decimalConversationFactor = ethers.utils.parseUnits('1', 18 - collateralDecimal)
    return amount.div(decimalConversationFactor)
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
        const { owner, deadline, sign } = await getPermitData(pool, amount, MNEMONIC, user1.address)
        await pool.permit(owner, user1.address, amount, deadline, sign.v, sign.r, sign.s)
        const allowance = await pool.allowance(owner, user1.address)
        expect(allowance).to.be.equal(amount, `${poolName} allowance is wrong`)
      })
    })

    describe(`Deposit ${collateralName} into the ${poolName} pool`, function () {
      it(`Should deposit ${collateralName}`, async function () {
        const pricePerShareBefore = await pool.pricePerShare()
        const depositAmount = await deposit(10, user1)

        const externalDepositFee = await accountant.externalDepositFee()
        let expectedShares = depositAmount.mul(10 ** (18 - collateralDecimal))
        if (externalDepositFee.gt(0)) {
          const amountAfterFee = depositAmount.sub(depositAmount.mul(externalDepositFee).div('10000'))
          expectedShares = amountAfterFee.mul(ethers.utils.parseEther('1')).div(pricePerShareBefore)
          const pricePerShareAfter = await pool.pricePerShare()
          expect(pricePerShareAfter).to.gt(pricePerShareBefore, 'Price per share should increase')
        }

        const totalSupply = await pool.totalSupply()
        const totalValue = await pool.totalValue()
        const vPoolBalance = await pool.balanceOf(user1.address)

        expect(vPoolBalance).to.be.equal(expectedShares, `${poolName} balance of user is wrong`)
        expect(totalSupply).to.be.equal(vPoolBalance, `Total supply of ${poolName} is wrong`)
        expect(totalValue).to.be.equal(depositAmount, `Total value of ${poolName} is wrong`)
      })

      it(`Should deposit ${collateralName} and call rebalance() of each strategy`, async function () {
        const depositAmount = await deposit(50, user4)
        const totalValue = await pool.totalValue()
        for (const strategy of strategies) {
          await rebalanceStrategy(strategy)
          const strategyParams = await pool.strategy(strategy.instance.address)
          if (strategyParams._debtRatio.gt(0)) {
            const receiptToken = await ethers.getContractAt('IERC20', await strategy.instance.token())
            let receiptTokenBalance = await getIfExist(strategy.instance.totalLp)
            if (!receiptTokenBalance) {
              receiptTokenBalance = await receiptToken.balanceOf(strategy.instance.address)
            }
            expect(receiptTokenBalance).to.be.gt(0, 'receipt token balance of strategy is wrong')
          }
        }
        const totalDebtOfStrategies = await totalDebtOfAllStrategy(strategies, pool)
        const totalDebt = await pool.totalDebt()
        const totalSupply = convertFrom18(await pool.totalSupply())
        const vPoolBalance = convertFrom18(await pool.balanceOf(user4.address))
        // Due to deposit fee, issued shares will be less than deposit amount, even if PPS is 1
        expect(vPoolBalance).to.be.lte(depositAmount, `${poolName} balance of user is wrong`)
        expect(totalDebtOfStrategies).to.be.equal(totalDebt, `${collateralName} totalDebt of strategies is wrong`)
        expect(totalSupply).to.be.equal(vPoolBalance, `Total supply of ${poolName} is wrong`)
        expect(totalValue).to.be.gte(depositAmount, `Total value of ${poolName} is wrong`)
      })
    })

    describe(`Withdraw ${collateralName} from ${poolName} pool`, function () {
      let depositAmount
      const valueDust = '100000'
      beforeEach(async function () {
        depositAmount = await deposit(10, user1)
      })

      it(`Should withdraw all ${collateralName} before rebalance`, async function () {
        const withdrawAmount = await pool.balanceOf(user1.address)
        const pricePerShare = await pool.pricePerShare()
        const expectedCollateral = withdrawAmount.mul(pricePerShare).div(ethers.utils.parseEther('1'))

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
          expect(vPoolBalance).to.be.equal(0, `${poolName} balance of user is wrong`)
          // If external deposit fee is non zero, pool may be in net gain which will leave token dust in pool
          expect(totalValue).to.be.lte(valueDust, `Total value of ${poolName} is wrong`)
          expect(collateralBalance).to.be.equal(expectedCollateral, `${collateralName} balance of user is wrong`)
        })
      })

      it(`Should withdraw partial ${collateralName} before rebalance`, async function () {
        let vPoolBalance = await pool.balanceOf(user1.address)
        const amountToKeep = ethers.utils.parseUnits('100', 18 - collateralDecimal) // 100 Wei
        const withdrawAmount = vPoolBalance.sub(amountToKeep)
        const pricePerShare = await pool.pricePerShare()
        const expectedCollateral = withdrawAmount.mul(pricePerShare).div(ethers.utils.parseEther('1'))
        // Withdraw
        await pool.connect(user1.signer).withdraw(withdrawAmount)
        vPoolBalance = await pool.balanceOf(user1.address)
        const collateralBalance = await collateralToken.balanceOf(user1.address)
        const totalDebt = await pool.totalDebt()
        const totalDebtOfStrategies = await totalDebtOfAllStrategy(strategies, pool)
        expect(totalDebtOfStrategies).to.be.equal(totalDebt, `${collateralName} totalDebt of strategies is wrong`)
        expect(vPoolBalance).to.equal(amountToKeep, `${poolName} balance of user is wrong`)
        expect(collateralBalance).to.equal(expectedCollateral, `${collateralName} balance of user is wrong`)
      })

      it(`Should withdraw ${collateralName} using whitelistedWithdraw()`, async function () {
        await rebalance(strategies)
        const collateralBalanceBefore = await collateralToken.balanceOf(user1.address)
        const withdrawAmount = '10000000000000000'
        await pool.connect(user1.signer).whitelistedWithdraw(withdrawAmount)
        const collateralBalance = await collateralToken.balanceOf(user1.address)
        const totalDebt = await pool.totalDebt()
        const totalDebtOfStrategies = await totalDebtOfAllStrategy(strategies, pool)
        expect(totalDebtOfStrategies).to.be.equal(totalDebt, `${collateralName} totalDebt of strategies is wrong`)
        expect(collateralBalance).to.be.gt(collateralBalanceBefore, 'Withdraw failed')
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
        const withdrawAmount = (await pool.balanceOf(user1.address)).div(2)
        await pool.connect(user1.signer).withdraw(withdrawAmount)
        const totalDebt = await pool.totalDebt()
        const totalDebtOfStrategies = await totalDebtOfAllStrategy(strategies, pool)
        expect(totalDebtOfStrategies).to.be.equal(totalDebt, `${collateralName} totalDebt of strategies is wrong`)
        const collateralBalance = await collateralToken.balanceOf(user1.address)
        expect(collateralBalance).to.be.gt(collateralBalanceBefore, 'Withdraw failed')
      })

      it(`Should withdraw all ${collateralName} after rebalance`, async function () {
        if (SKIP_TEST_COLLATERAL_TOKENS.includes(collateralToken.address)) {
          return true
        }
        // reset universal fee to 0.
        await pool.updateUniversalFee('0')
        depositAmount = await deposit(5, user2)
        await rebalance(strategies)
        // Some strategies can report a loss if they don't have time to earn anything
        // Time travel based on type of strategy. For compound strategy mine 500 blocks, else time travel
        await timeTravel(60 * 24 * 60 * 60, 500, '', '', strategies)
        await rebalance(strategies)
        const user1Balance = await pool.balanceOf(user1.address)
        // Earn pool leaves dust behind sometimes
        const dust = user1Balance.div(1000000) // 0.0001 % dust
        await pool.connect(user1.signer).withdraw(user1Balance)
        return Promise.all([pool.balanceOf(user1.address), collateralToken.balanceOf(user1.address)]).then(function ([
          vPoolBalance,
          collateralBalance,
        ]) {
          expect(vPoolBalance).to.be.closeTo('0', dust, `${poolName} balance of user is wrong`)
          expect(collateralBalance).to.be.gte(depositAmount, `${collateralName} balance of user is wrong`)
        })
      })
    })

    describe(`Multi transfer ${poolName} pool tokens`, function () {
      it('Should transfer to multiple recipients', async function () {
        await deposit(100, user1)
        const user1Balance = await pool.balanceOf(user1.address)
        const balanceBefore = await pool.balanceOf(user4.address)
        expect(balanceBefore).to.be.equal(0, `${collateralName} balance should be 0`)
        await pool
          .connect(user1.signer)
          .multiTransfer([user3.address, user4.address], [user1Balance.div(3), user1Balance.div(4)])
        return Promise.all([pool.balanceOf(user3.address), pool.balanceOf(user4.address)]).then(function ([
          balance1,
          balance2,
        ]) {
          expect(balance1).to.be.equal(user1Balance.div(3), `${collateralName} balance is wrong`)
          expect(balance2).to.be.equal(user1Balance.div(4), `${collateralName} balance is wrong`)
        })
      })

      it('Should have same size for recipients and amounts', async function () {
        await deposit(10, user1)
        const tx = pool.connect(user1.signer).multiTransfer([user3.address, user4.address], [DECIMAL18])
        await expect(tx).to.be.revertedWith('4')
      })
    })

    describe(`Rebalance ${poolName} pool`, function () {
      it('Should rebalance multiple times.', async function () {
        const depositAmount = await deposit(10, user3)
        await rebalance(strategies)
        let totalDebtRatio = await pool.totalDebtRatio()
        let totalValue = await pool.totalValue()
        let maxDebt = totalValue.mul(totalDebtRatio).div(MAX_BPS)

        // The following will always fail for CRV strategies
        if (!strategies[0].type.toUpperCase().includes('CURVE')) {
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
        // Advance 1 block for proper available credit limit check
        await advanceBlock(1)
        let unusedCredit = BN.from('0')
        for (const strategy of strategies) {
          const credit = await pool.availableCreditLimit(strategy.instance.address)
          unusedCredit = unusedCredit.add(credit)
        }
        const totalDebt = await pool.totalDebt()
        const totalSupply = convertFrom18(await pool.totalSupply())
        const vPoolBalance = convertFrom18(await pool.balanceOf(user3.address))

        expect(maxDebt.sub(unusedCredit).sub(totalDebt).toNumber()).to.almost.eq(
          0,
          `${collateralName} total debt of pool is wrong`,
        )
        // If external deposit fee is non zero, shares will be less than deposit amount
        expect(vPoolBalance, `${poolName} balance of user is wrong`).to.be.lte(depositAmount)
        expect(totalSupply, `Total supply of ${poolName} is wrong`).to.be.gte(vPoolBalance)
      })

      it('Should update strategy lastRebalance param', async function () {
        // given
        const [strategyToRebalance] = strategies
        const { _lastRebalance: lastRebalanceBefore } = await pool.strategy(strategyToRebalance.instance.address)

        // when
        await timeTravel()
        await rebalance([strategyToRebalance])

        // then
        const { _lastRebalance: lastRebalanceAfter } = await pool.strategy(strategyToRebalance.instance.address)
        expect(lastRebalanceAfter).to.gt(lastRebalanceBefore)
      })
    })

    describe(`Price per share of ${poolName} pool`, function () {
      if (isEarnPool) {
        it('Should not increase pool value', async function () {
          await deposit(20, user1)
          await rebalance(strategies)
          // Curve strategy takes a loss initially hence taking value after 1st rebalance
          const value1 = await pool.totalValue()
          // Time travel to generate earning
          await timeTravel(30 * 24 * 60 * 60)
          await rebalance(strategies)
          await rebalance(strategies)
          const value2 = await pool.totalValue()
          expect(value2).to.be.eq(value1, `${poolName} Pool value should not increase`)
        })
      } else {
        it('Should increase pool value', async function () {
          await deposit(20, user1)
          await rebalance(strategies)
          // some strategies are loss making so lets make strategy profitable by sending token
          if (collateralToken.address === NATIVE_TOKEN) {
            const weth = await ethers.getContractAt('TokenLike', collateralToken.address, user1.signer)
            const transferAmount = ethers.utils.parseEther('2')
            await weth.deposit({ value: transferAmount })
            await weth.transfer(strategies[0].instance.address, transferAmount)
          } else {
            await swapper.swapEthForToken(2, collateralToken.address, user1, strategies[0].instance.address)
          }
          const value1 = await pool.totalValue()
          // Time travel to generate earning
          await rebalance(strategies)
          const value2 = await pool.totalValue()
          expect(value2).to.be.gt(value1, `${poolName} Pool value should increase`)
        })
      }
    })

    describe(`Universal fee in ${poolName} pool`, function () {
      let secondsPerYear
      let universalFee

      beforeEach(async function () {
        // Set external deposit fee to 0 for curve strategies
        await accountant.updateExternalDepositFee(strategies[0].instance.address, '0')

        if (collateralToken.address === NATIVE_TOKEN) {
          await deposit(30, user1)
        } else {
          // TODO this is temporary, update poolOps.js deposit to always use adjustBalance library
          const depositAmount = ethers.utils.parseUnits('30', collateralDecimal)
          await adjustBalance(collateralToken.address, user1.address, depositAmount)
          await collateralToken.connect(user1.signer).approve(pool.address, depositAmount)
          await pool.connect(user1.signer).deposit(depositAmount)
        }
        secondsPerYear = await pool.ONE_YEAR()
        universalFee = await pool.universalFee()
      })
      if (isEarnPool) {
        it('Earn Pool:: Should collect universal fee on rebalance', async function () {
          const earnDrip = await ethers.getContractAt('IEarnDrip', await pool.poolRewards())
          let rewardToken = await ethers.getContractAt('ERC20', await earnDrip.growToken())
          const dripToken = await ethers.getContractAt('ERC20', strategies[0].constructorArgs.dripToken)
          if (rewardToken.address === ethers.constants.AddressZero) {
            rewardToken = dripToken
          }
          const feeCollector = strategies[0].feeCollector
          const rewardBalanceBefore = await rewardToken.balanceOf(feeCollector)
          const dripBalanceBefore = await dripToken.balanceOf(feeCollector)
          const collateralBalanceBefore = await collateralToken.balanceOf(feeCollector)

          await deposit(20, user1)
          await rebalance(strategies)
          await makeStrategyProfitable(strategies[0].instance, dripToken, collateralToken)
          await rebalance(strategies)

          const rewardBalanceAfter = await rewardToken.balanceOf(feeCollector)
          const dripBalanceAfter = await dripToken.balanceOf(feeCollector)
          const collateralBalanceAfter = await collateralToken.balanceOf(feeCollector)
          const type = strategies[0].type
          if (dripToken.address === Vesper.VSP || type === StrategyType.EARN_MAKER) {
            expect(dripBalanceAfter, 'Fee collected by FC is wrong').to.be.gt(dripBalanceBefore)
          } else if (type === StrategyType.EARN_VESPER_MAKER) {
            expect(rewardBalanceAfter, 'Fee collected by FC is wrong').to.be.gt(rewardBalanceBefore)
          } else {
            expect(collateralBalanceAfter, 'Fee collected by FC is wrong').to.be.gt(collateralBalanceBefore)
          }
        })
      } else {
        it('Should collect universal fee on rebalance', async function () {
          const feeCollector = await unlock(strategies[0].feeCollector)
          const timeBetweenRebalance = 60 * 60
          await rebalanceStrategy(strategies[0])
          // Advance some block will help compound related strategy to earn some profit
          await advanceBlock(300)
          // Increase time before doing another rebalance
          await increase(timeBetweenRebalance)
          const totalDebt = await accountant.totalDebtOf(strategies[0].instance.address)
          if (collateralToken.address === NATIVE_TOKEN) {
            const weth = await ethers.getContractAt('TokenLike', collateralToken.address, user1.signer)
            const transferAmount = ethers.utils.parseEther('2')
            await weth.deposit({ value: transferAmount })
            await weth.transfer(strategies[0].instance.address, transferAmount)
          } else {
            await swapper.swapEthForToken(2, collateralToken.address, user1, strategies[0].instance.address)
          }
          const tx = await rebalanceStrategy(strategies[0])
          const profit = (await getEvent(tx, accountant, 'EarningReported')).profit
          let fee = universalFee.mul(timeBetweenRebalance).mul(totalDebt).div(secondsPerYear).div(MAX_BPS)
          const maxFee = profit.mul(await pool.maxProfitAsFee()).div(MAX_BPS)
          if (fee.gt(maxFee)) {
            fee = maxFee
          }
          const vPoolBalance = await pool.balanceOf(feeCollector.address)
          expect(vPoolBalance, 'Fee earned by FC should be > 0').to.gt(0)
          await pool.connect(feeCollector).withdraw(vPoolBalance)
          expect(await pool.balanceOf(feeCollector.address), `${poolName} balance of FC should be equal to 0`).to.eq(0)
          const collateralBalance = await collateralToken.balanceOf(feeCollector.address)
          expect(collateralBalance, 'Incorrect fee collected').to.gte(fee)
        })

        it('Should collect universal fee equal to maxProfitAsFee', async function () {
          const strategySigner = await unlock(strategies[0].instance.address)
          // Manual and force report earning to get fund from pool
          await pool.connect(strategySigner).reportEarning(0, 0, 0)
          // Increase time
          await increase(60 * 60)
          // set universal fee super high.
          await pool.updateUniversalFee('5000')
          // Manual and force report earning with 1000 as profit
          const profit = BN.from(1000) // wei
          // Actual fee calculation on TVL will be higher than profit/2 so final fee will be profit/2
          const expectedFee = profit.mul(await pool.maxProfitAsFee()).div(MAX_BPS)
          const totalDebt = await accountant.totalDebtOf(strategies[0].instance.address)
          // This will trigger fee calculation
          const tx = pool.connect(strategySigner).reportEarning(profit, 0, 0)
          await expect(tx).emit(pool, 'UniversalFeePaid').withArgs(totalDebt, 1000, expectedFee)
          // feeAsShare is in 18 decimals, profit is in collateral decimals
          const expectedFeeAsShare = ethers.utils.parseUnits(expectedFee.toString(), 18 - collateralDecimal)
          expect(await pool.balanceOf(strategies[0].feeCollector), 'Fee earned by FC is wrong').to.eq(
            expectedFeeAsShare,
          )
        })
      }
    })

    describe(`Sweep ERC20 token in ${poolName} pool`, function () {
      it(`Should sweep ERC20 for ${collateralName}`, async function () {
        const ERC20Token = await ethers.getContractAt('ERC20', ANY_ERC20)
        await deposit(60, user2)
        await swapper.swapEthForToken(2, ANY_ERC20, user1, pool.address)
        await pool.sweepERC20(ANY_ERC20)
        const governor = await pool.governor()
        return Promise.all([
          pool.totalSupply(),
          pool.totalValue(),
          ERC20Token.balanceOf(pool.address),
          ERC20Token.balanceOf(governor),
        ]).then(function ([totalSupply, totalValue, metBalance, metBalanceFC]) {
          expect(totalSupply).to.be.gt(0, `Total supply of ${poolName} is wrong`)
          expect(totalValue).to.be.gt(0, `Total value of ${poolName} is wrong`)
          expect(metBalance).to.be.eq(0, 'ERC20 token balance of pool is wrong')
          expect(metBalanceFC).to.be.gt(0, 'ERC20 token balance of governor is wrong')
        })
      })

      it('Should not be able sweep reserved token', async function () {
        const tx = pool.sweepERC20(collateralToken.address)
        await expect(tx).to.be.revertedWith('8')
      })
    })

    describe(`${poolName}: Should report earning correctly`, function () {
      it('Strategy should receive more amount when new deposit happen', async function () {
        await deposit(75, user2)
        await rebalance(strategies)
        const totalDebtBefore = await pool.totalDebtOf(strategies[0].instance.address)
        await deposit(50, user2)
        await rebalance(strategies)
        const totalDebtAfter = await pool.totalDebtOf(strategies[0].instance.address)
        expect(totalDebtAfter).to.be.gt(totalDebtBefore, `Total debt of strategy in ${poolName} is wrong`)
      })

      // eslint-disable-next-line consistent-return
      it('Strategy should not receive new amount if current debt of pool > max debt', async function () {
        if (SKIP_TEST_COLLATERAL_TOKENS.includes(collateralToken.address)) {
          return true
        }
        await Promise.all([deposit(50, user1), deposit(60, user2)])
        await rebalance(strategies)

        let [totalDebtRatio, totalValue, totalDebtBefore] = await Promise.all([
          pool.totalDebtRatio(),
          pool.totalValue(),
          pool.totalDebt(),
        ])
        // Curve takes a loss initially, so we need to look for any excess debt to curve strategy
        let excessDebt = ethers.BigNumber.from(0)
        for (const strategy of strategies) {
          if (strategy.type.toUpperCase().includes('CURVE')) {
            const p = await pool.excessDebt(strategy.instance.address)
            excessDebt = excessDebt.add(p)
          }
        }
        let maxTotalDebt = totalValue.mul(totalDebtRatio).div(MAX_BPS)

        expect(Math.abs(maxTotalDebt.add(excessDebt).sub(totalDebtBefore))).to.almost.equal(
          1,
          `Total debt of ${poolName} is wrong after rebalance`,
        )
        const totalDebtOfStrategies = await totalDebtOfAllStrategy(strategies, pool)
        expect(Math.abs(maxTotalDebt.add(excessDebt).sub(totalDebtOfStrategies))).to.almost.equal(
          1,
          'Total debt of all strategies is wrong after rebalance',
        )
        const withdrawAmount = await pool.balanceOf(user1.address)
        await pool.connect(user1.signer).withdraw(withdrawAmount)
        // Withdraw decreases value
        totalValue = await pool.totalValue()
        // Value decreases maxTotalDebt
        maxTotalDebt = totalValue.mul(totalDebtRatio).div(MAX_BPS)
        // Withdraw decreases totalDebt of pool
        let totalDebtAfter = await pool.totalDebt()
        // TotalDebt of pool can be higher or equal than maxTotalDebt until rebalance happen
        expect(totalDebtAfter).to.be.gte(maxTotalDebt, `Total debt of ${poolName} is wrong after withdraw`)
        // TotalDebt after withdraw will be less than it was before
        expect(totalDebtAfter).to.be.lt(totalDebtBefore, `Total debt of ${poolName} is wrong after withdraw`)

        // In case of multiple strategies, most withdraw will happen from first strategy and most of
        // remaining debt is in other strategies hence rebalance other strategies to get fund back
        // and then rebalance first strategy.
        for (let i = 1; i < strategies.length; i++) {
          await strategies[i].instance.rebalance()
        }
        await strategies[0].instance.rebalance()

        // totalDebt of pool after rebalance, it should be close to maxTotalDebt
        totalDebtAfter = await pool.totalDebt()

        let delta = maxTotalDebt.div(100000) // allow 0.001% deviation
        if (delta.eq('0')) {
          delta = '1'
        }
        expect(totalDebtAfter).to.be.closeTo(
          maxTotalDebt,
          delta,
          `Total debt of ${poolName} is wrong after withdraw and rebalance`,
        )
      })

      it('Pool record correct value of profit and loss', async function () {
        await deposit(70, user2)
        await rebalance(strategies)
        await timeTravel(60 * 60)
        if (collateralToken.address === NATIVE_TOKEN) {
          const weth = await ethers.getContractAt('TokenLike', collateralToken.address, user1.signer)
          const transferAmount = ethers.utils.parseEther('2')
          await weth.deposit({ value: transferAmount })
          await weth.transfer(strategies[0].instance.address, transferAmount)
        } else {
          await swapper.swapEthForToken(2, collateralToken.address, user1, strategies[0].instance.address)
        }
        await rebalance(strategies)
        const strategyParams = await pool.strategy(strategies[0].instance.address)
        const totalProfit = strategyParams._totalProfit
        if (isEarnPool) {
          expect(totalProfit).to.be.eq(0, `Total debt of strategy in ${poolName} is wrong`)
        } else {
          expect(totalProfit).to.be.gt(0, `Total debt of strategy in ${poolName} is wrong`)
        }
      })
    })

    describe(`${poolName}: Available credit line`, function () {
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
    })

    if (isEarnPool) {
      describe(`${poolName}: Earn specific tests`, function () {
        let earnDrip, rewardToken, dripToken

        beforeEach(async function () {
          earnDrip = await ethers.getContractAt('IEarnDrip', await pool.poolRewards())
          rewardToken = await ethers.getContractAt('ERC20', await earnDrip.growToken())
          dripToken = await ethers.getContractAt('ERC20', strategies[0].constructorArgs.dripToken)
          if (rewardToken.address === ethers.constants.AddressZero) rewardToken = dripToken
        })

        it('Earn Pool should collect profits in rewardToken in drip contract', async function () {
          const rewardTokenBalanceBefore = await rewardToken.balanceOf(earnDrip.address)
          await deposit(20, user1)
          await rebalance(strategies)
          // Time travel to generate earning
          await timeTravel(30 * 24 * 60 * 60)
          // Making 1 strategy profitable is enough, no need to loop over all strategies
          await makeStrategyProfitable(strategies[0].instance, dripToken, collateralToken)
          await rebalance(strategies)
          // If VSP is drip token, then 1 rebalance will deposit VSP into vVSP  and then
          // next rebalance, after 24 hours, will transfer those and drip as rewards
          await rebalance(strategies)
          const rewardTokenBalanceAfter = await rewardToken.balanceOf(earnDrip.address)

          expect(rewardTokenBalanceAfter).to.be.gt(
            rewardTokenBalanceBefore,
            `rewardToken balance in ${poolName} is wrong`,
          )
        })

        it('Users should collect profits in dripToken using claimReward', async function () {
          await deposit(20, user1)

          const dripTokenBalanceBefore =
            dripToken.address === NATIVE_TOKEN
              ? await ethers.provider.getBalance(user1.address)
              : await dripToken.balanceOf(user1.address)

          await rebalance(strategies)
          // Time travel to generate earning
          await timeTravel(30 * 24 * 60 * 60)
          // Making 1 strategy profitable is enough, no need to loop over all strategies
          await makeStrategyProfitable(strategies[0].instance, dripToken, collateralToken)
          await rebalance(strategies)
          // If VSP is drip token, then 1 rebalance will deposit VSP into vVSP  and then
          // next rebalance, after 24 hours, will transfer those and drip as rewards
          await rebalance(strategies)
          await earnDrip.claimReward(user1.address)
          const dripTokenBalanceAfter =
            dripToken.address === NATIVE_TOKEN
              ? await ethers.provider.getBalance(user1.address)
              : await dripToken.balanceOf(user1.address)

          expect(dripTokenBalanceAfter).to.be.gt(dripTokenBalanceBefore, `dripToken balance in ${poolName} is wrong`)
        })

        it('Users should collect profits in dripToken on withdraw', async function () {
          await deposit(50, user1)
          await rebalance(strategies)
          // Time travel to generate earning
          await timeTravel(30 * 24 * 60 * 60)
          // Making 1 strategy profitable is enough, no need to loop over all strategies
          await makeStrategyProfitable(strategies[0].instance, dripToken, collateralToken)
          await rebalance(strategies)
          // If VSP is drip token, then 1 rebalance will deposit VSP into vVSP  and then
          // next rebalance, after 24 hours, will transfer those and drip as rewards
          await rebalance(strategies)
          const withdrawAmount = await pool.balanceOf(user1.address)

          let dripTokenBalanceBefore =
            dripToken.address === NATIVE_TOKEN
              ? await ethers.provider.getBalance(user1.address)
              : await dripToken.balanceOf(user1.address)

          await timeTravel(7 * 24 * 60 * 60)

          const withdrawTx = await (await pool.connect(user1.signer).withdrawAndClaim(withdrawAmount)).wait()

          if (dripToken.address === NATIVE_TOKEN) {
            dripTokenBalanceBefore = dripTokenBalanceBefore.sub(withdrawTx.cumulativeGasUsed)
          }

          const dripTokenBalanceAfter =
            dripToken.address === NATIVE_TOKEN
              ? await ethers.provider.getBalance(user1.address)
              : await dripToken.balanceOf(user1.address)

          expect(dripTokenBalanceAfter).to.be.gt(dripTokenBalanceBefore, `dripToken balance in ${poolName} is wrong`)
        })
      })
    }
  })
}

module.exports = { shouldBehaveLikePool }
