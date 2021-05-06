'use strict'

const {shouldBehaveLikePool} = require('../behavior/vesper-pool')
const {shouldBehaveLikeStrategy} = require('../behavior/maker-strategy')
const {setupVPool} = require('../utils/setupHelper')
const StrategyType = require('../utils/strategyTypes')
const {deposit} = require('../utils/poolOps')
const {expect} = require('chai')
const {time} = require('@openzeppelin/test-helpers')

const VETH = artifacts.require('VETH')
const AaveStrategy = artifacts.require('AaveMakerStrategyETH')
// const AaveStrategyETH = artifacts.require('AaveStrategyETH')
const CollateralManager = artifacts.require('CollateralManager')
const JugLike = artifacts.require('JugLike')
const {BigNumber: BN} = require('ethers')
const DECIMAL18 = BN.from('1000000000000000000')
const ONE_MILLION = DECIMAL18.mul('1000000')
/* eslint-disable mocha/max-top-level-suites */
contract('VETH Pool with AaveMakerStrategy', function (accounts) {
  let pool, strategy, collateralToken
  const [, user1, user2, user3, user4] = accounts
  const interestFee = '1500' // 15%
  const feeCollector = accounts[9]

  const strategyConfig = {interestFee, debtRatio: 9000, debtRate: ONE_MILLION}

  beforeEach(async function () {
    this.accounts = accounts
    await setupVPool(this, {
      pool: VETH,
      strategies: [{artifact: AaveStrategy, type: StrategyType.AAVE_MAKER, config: strategyConfig, feeCollector}],
      collateralManager: CollateralManager,
      feeCollector,
    })

    // this.newStrategy = AaveStrategyETH
    pool = this.pool
    strategy = this.strategy
    collateralToken = this.collateralToken
  })

  shouldBehaveLikePool('vETH', 'WETH')

  shouldBehaveLikeStrategy('vETH', 'WETH', 'aDAI', accounts)

  describe('Basic test with ETH as collateral', function() {
    it('Should deposit and rebalance', async function () {
      const depositAmount = BN.from('10').mul(DECIMAL18).toString()
      await pool.methods['deposit()']({value: depositAmount, from: user1})
        await pool.rebalance()
        return Promise.all([
          pool.tokenLocked(),
          pool.totalSupply(),
          pool.totalValue(),
          pool.balanceOf(user1),
        ]).then(function ([tokenLocked, totalSupply, totalValue, vPoolBalance]) {
          expect(tokenLocked).to.be.bignumber.equal(depositAmount, 'ETH locked is wrong')
          expect(totalSupply).to.be.bignumber.equal(depositAmount, 'Total supply of vETH is wrong')
          expect(totalValue).to.be.bignumber.equal(depositAmount, 'Total value of $ vETH is wrong')
          expect(vPoolBalance).to.be.bignumber.equal(depositAmount, 'vETH balance of user is wrong')
          
        })
    })

    it('Should deposit via fallback and rebalance', async function () {
      const depositAmount = BN.from('10').mul(DECIMAL18).toString()
      await web3.eth.sendTransaction({from:user2, to: pool.address, value: depositAmount})
        await pool.rebalance()
        return Promise.all([
          pool.tokenLocked(),
          pool.totalSupply(),
          pool.totalValue(),
          pool.balanceOf(user2),
        ]).then(function ([tokenLocked, totalSupply, totalValue, vPoolBalance]) {
          expect(tokenLocked).to.be.bignumber.equal(depositAmount, 'ETH locked is wrong')
          expect(totalSupply).to.be.bignumber.equal(depositAmount, 'Total supply of vETH is wrong')
          expect(totalValue).to.be.bignumber.equal(depositAmount, 'Total value of $ vETH is wrong')
          expect(vPoolBalance).to.be.bignumber.equal(depositAmount, 'vETH balance of user is wrong')
          
        })
    })

    it('Should withdraw all ETH after rebalance', async function () {
      const depositAmount = BN.from('10').mul(DECIMAL18).toString()
      await pool.methods['deposit()']({value: depositAmount, from: user3})
      await pool.rebalance()
      const ethBalanceBefore = await web3.eth.getBalance(user3)
      const withdrawAmount = await pool.balanceOf(user3)
      await pool.withdrawETH(withdrawAmount, {from: user3})
      return Promise.all([
        pool.tokenLocked(),
        pool.totalSupply(),
        pool.totalValue(),
        pool.balanceOf(user3),
        web3.eth.getBalance(user3),
      ]).then(function ([tokenLocked, totalSupply, totalValue, vPoolBalance, ethBalanceAfter]) {
        expect(tokenLocked).to.be.bignumber.equal('0', 'ETH locked is wrong')
        expect(totalSupply).to.be.bignumber.equal('0', 'Total supply of vETH is wrong')
        expect(totalValue).to.be.bignumber.equal('0', 'Total value of vETH is wrong')
        expect(vPoolBalance).to.be.bignumber.equal('0', 'vETH balance of user is wrong')
        expect(ethBalanceAfter).to.be.bignumber.gt(ethBalanceBefore, 'ETH balance of user is wrong')
      })
    })
  })

  describe('Interest fee calculation via Jug Drip', function () {
    it('Should earn interest fee on earned amount', async function () {
      await deposit(pool, collateralToken, 10, user1)
      await deposit(pool, collateralToken, 10, user2)
      await deposit(pool, collateralToken, 10, user3)
      await deposit(pool, collateralToken, 10, user4)

      await pool.rebalance()
      const tokenLocked1 = await pool.tokenLocked()
      await time.increase(24 * 60 * 60)
      // Update rate using Jug drip
      const jugLike = await JugLike.at('0x19c0976f590D67707E62397C87829d896Dc0f1F1')
      const vaultType = await strategy.collateralType()
      await jugLike.drip(vaultType)

      await pool.rebalance()
      // Calculate expected fee
      const tokenLocked2 = await pool.tokenLocked()
      const pricePerShare = await pool.getPricePerShare()
      
      const interestEarned = tokenLocked2.sub(tokenLocked1)
      const expectedInterestFee = interestEarned.mul(interestFee).div(DECIMAL18)
      const expectedVPoolToken = expectedInterestFee.mul(DECIMAL18).div(pricePerShare)

      let withdrawAmount = await pool.balanceOf(user1)
      await pool.withdraw(withdrawAmount, {from: user1})

      withdrawAmount = await pool.balanceOf(user2)
      await pool.withdraw(withdrawAmount, {from: user2})

      withdrawAmount = await pool.balanceOf(user3)
      await pool.withdraw(withdrawAmount, {from: user3})

      withdrawAmount = await pool.balanceOf(user4)
      await pool.withdraw(withdrawAmount, {from: user4})

      const balance = await pool.balanceOf(this.feeCollector)
      expect(balance).to.be.bignumber.equal(expectedVPoolToken, 'vETH balance of FC is wrong')

      await pool.withdraw(balance, {from: this.feeCollector})

      return Promise.all([pool.tokenLocked(), pool.totalSupply(), pool.totalValue(), pool.balanceOf(user1)]).then(
        function ([tokenLocked, totalSupply, totalValue, vPoolBalance]) {
          expect(tokenLocked).to.be.bignumber.equal('0', 'WETH locked is wrong')
          expect(totalSupply).to.be.bignumber.equal('0', 'Total supply of vETH is wrong')
          expect(totalValue).to.be.bignumber.equal('0', 'Total value of vETH is wrong')
          expect(vPoolBalance).to.be.bignumber.equal('0', 'vETH balance of user is wrong')
        }
      )
    })
  })
})
