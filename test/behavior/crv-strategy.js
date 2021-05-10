'use strict'

const swapper = require('../utils/tokenSwapper')
const {deposit} = require('../utils/poolOps')
const {expect} = require('chai')
const {BN, time} = require('@openzeppelin/test-helpers')
const DECIMAL = new BN('1000000000000000000')
const ERC20 = artifacts.require('ERC20')

// Crv strategy behavior test suite
function shouldBehaveLikeStrategy(poolName, collateralName, pTokenName, accounts) {
  let pool, strategy, controller, collateralToken, collateralDecimal, feeCollector
  const [owner, user4, user2, user3] = accounts

  function convertTo18(amount) {
    const multiplier = DECIMAL.div(new BN('10').pow(collateralDecimal))
    return new BN(amount).mul(multiplier).toString()
  }

  function convertFrom18(amount) {
    const divisor = DECIMAL.div(new BN('10').pow(collateralDecimal))
    return new BN(amount).div(divisor).toString()
  }

  describe(`${poolName}:: CrvStrategy basic tests`, function () {
    beforeEach(async function () {
      pool = this.pool
      strategy = this.strategy
      collateralToken = this.collateralToken
      feeCollector = this.feeCollector
      // Decimal will be used for amount conversion
      collateralDecimal = await this.collateralToken.decimals.call()
    })

    it('Should sweep erc20 from strategy', async function () {
      const metAddress = '0xa3d58c4e56fedcae3a7c43a725aee9a71f0ece4e'
      const token = await ERC20.at(metAddress)
      const tokenBalance = await swapper.swapEthForToken(1, metAddress, user4, strategy.address)
      await strategy.sweepErc20(metAddress)

      const totalSupply = await pool.totalSupply()
      const metBalanceInPool = await token.balanceOf(pool.address)
      expect(totalSupply).to.be.bignumber.equal('0', `Total supply of ${poolName} is wrong`)
      expect(metBalanceInPool).to.be.bignumber.equal(tokenBalance, 'ERC20 token balance is wrong')
    })

    describe(`${poolName}:: DepositAll in CrvStrategy`, function () {
      it(`Should deposit ${collateralName} and call depositAll() in Strategy`, async function () {
        const depositAmount = await deposit(pool, collateralToken, 2, user3)
        const tokensHere = await pool.tokensHere()
        await strategy.depositAll()
        const vPoolBalance = await pool.balanceOf(user3)
        expect(convertFrom18(vPoolBalance)).to.be.bignumber.equal(
          depositAmount,
          `${poolName} balance of user is wrong`
        )
        const totalLocked = await pool.tokenLocked()
        const adjTotalLocked = await strategy.estimateFeeImpact(totalLocked)
        expect(tokensHere).to.be.bignumber.gte(adjTotalLocked, 'Token locked is not correct')
      })
    })

    describe(`${poolName}:: DepositValue in CrvStrategy`, function () {
      it(`Should deposit ${collateralName} and call depositAll() in Strategy`, async function () {
        const depositAmount = await deposit(pool, collateralToken, 2, user3)
        const tokensHere = await pool.tokensHere()
        await strategy.depositAll()
        const vPoolBalance = await pool.balanceOf(user3)
        expect(convertFrom18(vPoolBalance)).to.be.bignumber.equal(
          depositAmount,
          `${poolName} balance of user is wrong`
        )
        const totalLocked = await pool.tokenLocked()
        const adjTotalLocked = await strategy.estimateFeeImpact(totalLocked)
        expect(tokensHere).to.be.bignumber.gte(adjTotalLocked, 'Token locked is not correct')
      })
    })

    describe(`${poolName}:: Interest fee via CrvStrategy`, function () {
      it('Should handle interest fee correctly after withdraw', async function () {
        await deposit(pool, collateralToken, 40, user2)
        await pool.rebalance()
        const pricePerShare = await pool.getPricePerShare()
        const vPoolBalanceBefore = await pool.balanceOf(feeCollector)

        // Time travel 10 hours to earn some crv & dai
        await time.increase(100 * 60 * 60)
        await pool.rebalance()
        const pricePerShare2 = await pool.getPricePerShare()

        expect(pricePerShare2).to.be.bignumber.gt(pricePerShare, 'PricePerShare should be higher after time travel')
        await pool.withdraw(await pool.balanceOf(user2), {from: user2})

        const tokenLocked = await pool.tokenLocked()
        expect(tokenLocked).to.be.bignumber.gt('0', 'Token locked should be greater than zero')

        const totalSupply = await pool.totalSupply()
        expect(totalSupply).to.be.bignumber.gt('0', 'Total supply should be greater than zero')

        const vPoolBalanceAfter = await pool.balanceOf(feeCollector)
        expect(vPoolBalanceAfter).to.be.bignumber.gt(vPoolBalanceBefore, 'Fee collected is not correct')

        const dust = DECIMAL.div(new BN('100')) // Dust is less than 1e16
        const tokensHere = await pool.tokensHere()
        expect(tokensHere).to.be.bignumber.lt(dust, 'Tokens here is not correct')
        
      })
    })

    describe(`${poolName}:: Updates via Controller`, function () {
      it('Should call withdraw() in strategy', async function () {
        await deposit(pool, collateralToken, 20, user4)
        await pool.rebalance()

        const vPoolBalanceBefore = await pool.balanceOf(user4)
        const collateralBalanceBefore = await collateralToken.balanceOf(pool.address)


        const totalSupply = await pool.totalSupply()
        const price = await pool.getPricePerShare()
        const withdrawAmount = totalSupply.mul(price).div(DECIMAL).toString()
        
        const target = strategy.address
        const methodSignature = 'withdraw(uint256)'
        const data = web3.eth.abi.encodeParameter('uint256', withdrawAmount)
        await controller.executeTransaction(target, 0, methodSignature, data, {from: accounts[0]})

        const vPoolBalance = await pool.balanceOf(user4)
        const collateralBalance = await collateralToken.balanceOf(pool.address)

        expect(collateralBalance).to.be.bignumber.gt(
          collateralBalanceBefore, `${collateralName} balance of pool is wrong`)
        expect(vPoolBalance).to.be.bignumber.eq(vPoolBalanceBefore, `${poolName} balance of user is wrong`)
      })

      it('Should call withdrawAll() in strategy', async function () {
        await deposit(pool, collateralToken, 2, user3)
        await pool.rebalance()

        // const totalLockedBefore = await strategy.totalLocked()

        const target = strategy.address
        const methodSignature = 'withdrawAll()'
        const data = '0x'
        await controller.executeTransaction(target, 0, methodSignature, data, {from: owner})

        // const tokensInPool = await pool.tokensHere()
        const totalLocked = await strategy.totalLocked()

        expect(totalLocked).to.be.bignumber.eq('0', 'Total Locked should be 0')
        // expect(tokensInPool).to.be.bignumber.gte(totalLockedBefore, 
        // 'Tokens in pool should be at least what was estimated')
      })

      it('Should rebalance after withdrawAll() and adding new strategy', async function () {
        await deposit(pool, collateralToken, 10, user3)
        await pool.rebalance()
        // const totalLockedBefore = await strategy.totalLocked()

        const target = strategy.address
        let methodSignature = 'withdrawAll()'
        const data = '0x'
        await controller.executeTransaction(target, 0, methodSignature, data, {from: owner})

        strategy = await this.newStrategy.new(controller.address, pool.address)
        methodSignature = 'approveToken()'
        await controller.executeTransaction(strategy.address, 0, methodSignature, data)

        await controller.updateStrategy(pool.address, strategy.address)
        await pool.rebalance()

        const totalLockedAfter = await strategy.totalLocked()
        expect(totalLockedAfter).to.be.bignumber.gte('0', 'Total locked with new strategy is wrong')

        const withdrawAmount = await pool.balanceOf(user3)
        await pool.withdraw(withdrawAmount, {from: user3})

        const collateralBalance = convertTo18(await collateralToken.balanceOf(user3))
        expect(collateralBalance).to.be.bignumber.gt('0', `${collateralName} balance of user is wrong`)
      })
    })

    describe('Interest Earned', function () {
      it('Should get the interest earned', async function() {
        let interestEarned = await strategy.interestEarned()
        expect(interestEarned).to.be.bignumber.eq('0', 'Phantom interest is occurring')

        await deposit(pool, collateralToken, 10, user3)
        await pool.rebalance()

        // Time travel 10 hours to earn some crv & dai
        await time.increase(100 * 60 * 60)

        // withdrawals trigger update to stored values
        await pool.withdraw(new BN(1).mul(DECIMAL), {from: user3})

        let interestEarnedAfter = await strategy.interestEarned()
        expect(interestEarnedAfter).to.be.bignumber.gte(interestEarned, 'Interest did not grow (1)')

        await pool.withdraw(new BN(1).mul(DECIMAL), {from: user3})
        interestEarned = await strategy.interestEarned()

        await time.increase(100 * 60 * 60)
        await pool.withdraw(new BN(1).mul(DECIMAL), {from: user3})

        interestEarnedAfter = await strategy.interestEarned()
        expect(interestEarnedAfter).to.be.bignumber.gte(interestEarned, 'Interest did not grow (2)')

        const percentIncrease = (interestEarnedAfter.sub(interestEarned))
          .mul(new BN(10000))
          .div(interestEarned).toNumber()
        const readablePI = percentIncrease / 100
        // actual interest diff here should be just over 100%, because we earn one extra block of interest
        expect(readablePI).to.be.lt(101, 'Interest calculation is wrong')
      })
    })
  })
}

module.exports = {shouldBehaveLikeStrategy}
