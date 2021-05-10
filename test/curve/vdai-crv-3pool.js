'use strict'

/* eslint-disable no-console */
const {expect} = require('chai')
const hre = require('hardhat')
const ethers = hre.ethers
// const provider = hre.waffle.provider

const {shouldBehaveLikePool} = require('../behavior/vesper-pool')
// const {shouldBehaveLikeStrategy} = require('../behavior/crv-strategy')
const {deposit, timeTravel} = require('../utils/poolOps')
const StrategyType = require('../utils/strategyTypes')
const {setupVPool, getUsers} = require('../utils/setupHelper')
const swapper = require('../utils/tokenSwapper')
// const {BN, time} = require('@openzeppelin/test-helpers')
const DECIMAL18 = ethers.BigNumber.from('1000000000000000000')
const ONE_MILLION = DECIMAL18.mul('1000000')
const DECSIX = ethers.BigNumber.from('6')

const DAI = '0x6b175474e89094c44da98b954eedeac495271d0f'
const USDC = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7'
const SUSHI_ROUTER = '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F'

const THREE_CRV = '0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490'
const THREE_POOL = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7'

  /* eslint-disable mocha/no-setup-in-describe */

describe('vDAI Pool with Crv3PoolStrategy', function () {
  let pool, collateralToken, controller, feeCollector, strategy, threePool, lpToken, daiToken, usdcToken, usdtToken,
    owner, user1, user2, user3, user4, user5, user6, user7, user8, feeAcct

  function convertTo18(amount, decimal) {
    const multiplier = DECIMAL18.div(ethers.BigNumber.from('10').pow(decimal))
    return ethers.BigNumber.from(amount).mul(multiplier)
  }

  before(async function() {
    const users = await getUsers()
    this.users = users

    ;[owner, user1, user2, user3, user4, user5, user6, user7, user8, feeAcct] = users

    threePool = await ethers.getContractAt('IStableSwap3Pool', THREE_POOL)
    lpToken = await ethers.getContractAt('IERC20', THREE_CRV)
    daiToken = await ethers.getContractAt('IERC20', DAI)
    usdcToken = await ethers.getContractAt('IERC20', USDC)
    usdtToken = await ethers.getContractAt('IERC20', USDT)
  })

  beforeEach(async function () {
    const interestFee = '1500' // 15%
    const strategyConfig = {interestFee, debtRatio: 10000, debtRate: ONE_MILLION}

    await setupVPool(this, {
      poolName: 'VDAI',
      feeCollector: feeAcct.address,
      strategies: [
        {name: 'Crv3PoolStrategyDAI', type: StrategyType.CURVE, config: strategyConfig, feeCollector: feeAcct.address},
      ],
    })

    pool = this.pool
    collateralToken = this.collateralToken
    controller = this.controller
    strategy = this.strategies[0].instance
    feeCollector = this.feeCollector
  })

  shouldBehaveLikePool('vDai', 'DAI')
  // shouldBehaveLikeStrategy('vDai', 'DAI', 'crv')

  describe('Crv3PoolStrategy: DAI Functionality', function() {
    it('Should calculate fees properly and reflect those in share price', async function () {
      await deposit(pool, collateralToken, 20, user1)
      await strategy.rebalance()
      const price1 = await pool.pricePerShare()
      // Time travel to generate earning
      await timeTravel(30*24*60*60)
      await deposit(pool, collateralToken, 20, user2)
      await strategy.rebalance()
      const price2 = await pool.pricePerShare()
      expect(price2).to.be.gt(price1, 'Share value should increase (1)')
      // Time travel to generate earning
      await timeTravel(30*24*60*60)
      await deposit(pool, collateralToken, 20, user3)
      await timeTravel(30*24*60*60)
      await strategy.rebalance()
      const price3 = await pool.pricePerShare()
      expect(price3).to.be.gt(price2, 'Share value should increase (2)')
    })

    // These need to be rewritten for hardhat
    /* eslint-disable */
    it('Large Deposits / Withdrawals have limited slippage', async function() {
        const depAmt = await deposit(pool, collateralToken, 99700, user1)
        console.log(depAmt.toString())
        const userBal = await pool.balanceOf(user1)
        await pool.rebalance()
        await pool.withdraw(userBal, {from: user1})
        const userBalFinal = await collateralToken.balanceOf(user1)
        console.log(userBalFinal.toString())
        const compAmt = depAmt.mul(new BN(995)).div(new BN(1000))
        console.log(compAmt.toString())
        expect(userBalFinal).to.be.bignumber.gte(compAmt, 'Slippage and fees were greater than 0.5%')
    })

    it('Should be able to migrate out / in', async function() {
      await controller.updateInterestFee(pool.address, '0')
      await deposit(pool, collateralToken, 20, user8)
      await pool.rebalance()

      let vPoolBalance = await pool.balanceOf(user8)
      await pool.withdraw(vPoolBalance.div(new BN(2)), {from: user8})
      await timeTravel(6*60*60)

      // Migrate out
      let target = strategy.address
      let methodSignature = 'migrateOut()'
      let data = '0x'
      await controller.executeTransaction(target, 0, methodSignature, data)

      let lpBalance = await lpToken.balanceOf(pool.address)
      expect(lpBalance).to.be.gt('0', 'lp did not transfer on migrateOut')

      strategy = await this.newStrategy.new(controller.address, pool.address)

      await controller.updateStrategy(pool.address, strategy.address)
      methodSignature = 'approveToken()'
      await controller.executeTransaction(strategy.address, 0, methodSignature, data)
      await timeTravel(6*60*60)

      // // Deposit and rebalance with new strategy but before migrateIn
      await deposit(pool, collateralToken, 20, user7)
      await pool.rebalance()

      // Migrate in
      target = strategy.address
      methodSignature = 'migrateIn()'
      data = '0x'
      await controller.executeTransaction(target, 0, methodSignature, data)
      await timeTravel(6*60*60)

      lpBalance = await lpToken.balanceOf(pool.address)
      expect(lpBalance).to.be.bignumber.eq('0', 'lp did not transfer on migrateIn')
      lpBalance = await lpToken.balanceOf(strategy.address)
      expect(lpBalance).to.be.bignumber.gt('0', 'lp is not in the strategy')
      let tlp = await strategy.totalLp()
      expect(tlp).to.be.bignumber.gt('0', 'tlp is 0')

      // Deposit and rebalance after migrateIn
      const depositAmount = await deposit(pool, collateralToken, 20, user7)
      await pool.rebalance()

      vPoolBalance = await pool.balanceOf(user8)
      await pool.withdraw(vPoolBalance, {from: user8})
      vPoolBalance = await pool.balanceOf(user7)
      await pool.withdraw(vPoolBalance, {from: user7})

      lpBalance = await lpToken.balanceOf(strategy.address)
      tlp = await strategy.totalLp()
      vPoolBalance = await pool.balanceOf(user8)
      const daiBalance = await collateralToken.balanceOf(user8)

      expect(lpBalance).to.be.bignumber.eq('0', 'lp balance should be 0')
      expect(tlp).to.be.bignumber.eq('0', 'tlp should be 0')
      expect(vPoolBalance).to.be.bignumber.eq('0', 'Pool balance of user should be zero')
      expect(daiBalance).to.be.bignumber.gt(depositAmount,'DAI balance should be > deposit amount')
    })

    it('Test withdrawAll with Large Deposits', async function() {
      // We got DAI in the previous test
      // user 2 gets usdc
      console.log('1. making trades')
      let usdcBal = await swapper.swapEthForToken(99000, USDC, user2, user2)
      let usdtBal = await swapper.swapEthForToken(99000, USDT, user3, user3)
      const moreDai = await swapper.swapEthForToken(99000, DAI, user6, user6, SUSHI_ROUTER)
      const moreUsdc = await swapper.swapEthForToken(99000, USDC, user4, user4, SUSHI_ROUTER)
      const moreUsdt = await swapper.swapEthForToken(99000, USDT, user5, user5, SUSHI_ROUTER)

      console.log('2. transfers')

      // await daiToken.approve(threePool.address, daiBal, {from: user1})
      await daiToken.transfer(user1, moreDai, {from: user6})
      await usdcToken.transfer(user1, usdcBal, {from: user2})
      await usdcToken.transfer(user1, moreUsdc, {from: user4})
      await usdtToken.transfer(user1, usdtBal, {from: user3})
      await usdtToken.transfer(user1, moreUsdt, {from: user5})

      const daiBal = await daiToken.balanceOf(user1)
      usdcBal = await usdcToken.balanceOf(user1)
      usdtBal = await usdtToken.balanceOf(user1)

      console.log(daiBal.toString())
      console.log(usdcBal.toString())
      console.log(usdtBal.toString())

      const sumUSD = daiBal.add(convertTo18(usdcBal, DECSIX)).add(convertTo18(usdtBal, DECSIX))
      console.log(sumUSD.div(new BN(2)).toString())

      console.log('3. approvals')

      await daiToken.approve(threePool.address, daiBal, {from: user1})
      await usdcToken.approve(threePool.address, usdcBal, {from: user1})
      await usdtToken.approve(threePool.address, usdtBal, {from: user1})

      console.log('4. add liq')

      threePool.add_liquidity([daiBal, usdcBal, usdtBal], 1, {from: user1})

      console.log('5. small vPool deposit')

      await deposit(pool, collateralToken, 1, user7)
      await pool.rebalance()
      const pricePerShare = await pool.pricePerShare()
      console.log(pricePerShare.toString())

      console.log('6. Move LP Tokens to Strategy & Rebalance')

      let lpBal = await lpToken.balanceOf(user1)
      lpBal = lpBal.div(new BN(2))
      console.log(lpBal.toString())

      await lpToken.transfer(strategy.address, lpBal, {from: user1})
      await pool.rebalance()

      const pricePerShareAfter = await pool.pricePerShare()
      console.log(pricePerShareAfter.toString())

      console.log('7. Withdraw All')

      const target = strategy.address
      const methodSignature = 'withdrawAll()'
      const data = '0x'
      await controller.executeTransaction(target, 0, methodSignature, data, {from: owner})

      const poolDai = await daiToken.balanceOf(pool.address)
      const feeDai = await daiToken.balanceOf(feeCollector)
      console.log(poolDai.toString())
      console.log(feeDai.toString())
    })

    // This doesnt actually test anything, it just makes it easy to estimate APY
    // eslint-disable-next-line
    it('Crv3PoolStrategy: DAI APY', async function() {
      await deposit(pool, collateralToken, 20, user3)
      const initPPS = await pool.pricePerShare()
      let gasUsed = ethers.BigNumber.from(0)
      // 1 rebalance(s) / day over 30 days
      console.log('Calculating ~%APY using 1 Rebalance / Day for 30 Days')
      for (let i = 0; i < 30; i++) {
          const tx = await strategy.rebalance()
          const receipt = await ethers.provider.getTransactionReceipt(tx.hash)
          gasUsed = gasUsed.add(receipt.gasUsed)
          await timeTravel(24*60*60)
          console.log(`Day ${i+1}: ${receipt.gasUsed}`)
      }
      const finPPS = await pool.pricePerShare()
      const percentIncrease = (finPPS.sub(initPPS)).mul(ethers.BigNumber.from(120000)).div(initPPS).toNumber()
      const readablePI = percentIncrease / 100
      const feeBal = await pool.balanceOf(feeCollector)
      console.log(feeBal.toString())
      const userBal = await pool.balanceOf(user3.address)
      console.log(userBal.toString())
      const vSupply = await pool.totalSupply()
      console.log(vSupply.toString())
      console.log(`VDAI CRV 3POOL is operating at roughly ${readablePI}% APY`)
      console.log(`avg gas used by rebalance: ${gasUsed.div(ethers.BigNumber.from(30))}`)
    })
  })
})
