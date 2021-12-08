'use strict'
/* eslint-disable no-console */
const { expect } = require('chai')
const { ethers } = require('hardhat')
const { prepareConfig } = require('./config')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { shouldBehaveLikeStrategy } = require('../behavior/strategy')
const { swapEthForToken } = require('../utils/tokenSwapper')
const { deposit, timeTravel } = require('../utils/poolOps')
const { strategyConfig } = require('../utils/chains').getChainData()
const ONE_MILLION = ethers.utils.parseEther('1000000')
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
const THREE_POOL = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7'

describe('vDAI Pool with Crv3PoolStrategy', function () {
  const strategy1 = strategyConfig.Crv3PoolStrategyDAI
  strategy1.config.debtRatio = 10000
  const strategies = [strategy1]
  prepareConfig(strategies)

  describe('Pool Tests', function () {
    shouldBehaveLikePool('vDai', 'DAI')
  })

  describe('Strategy Tests', function () {
    shouldBehaveLikeStrategy(0, strategies[0].type, strategies[0].contract)
  })

  describe('Crv3PoolStrategy: DAI Functionality', function () {
    let pool, collateralToken, feeCollector, strategy, user1, user2, user3, user4, threePool
    beforeEach(async function () {
      ;[, user1, user2, user3] = this.users
      pool = this.pool
      collateralToken = this.collateralToken
      strategy = this.strategies[0].instance
      feeCollector = this.feeCollector
      threePool = await ethers.getContractAt('IStableSwap3x', THREE_POOL)
    })
    it('Should calculate fees properly and reflect those in share price', async function () {
      await deposit(pool, collateralToken, 20, user1)
      await strategy.rebalance()
      const price1 = await pool.pricePerShare()
      // Time travel to generate earning
      await timeTravel(30 * 24 * 60 * 60)
      await deposit(pool, collateralToken, 20, user2)
      await strategy.rebalance()
      const price2 = await pool.pricePerShare()
      expect(price2).to.be.gt(price1, 'Share value should increase (1)')
      // Time travel to generate earning
      await timeTravel(30 * 24 * 60 * 60)
      await deposit(pool, collateralToken, 20, user3)
      await timeTravel(30 * 24 * 60 * 60)
      await strategy.rebalance()
      const price3 = await pool.pricePerShare()
      expect(price3).to.be.gt(price2, 'Share value should increase (2)')
    })

    // This doesnt actually test anything, it just makes it easy to estimate APY
    // eslint-disable-next-line
    xit('Crv3PoolStrategy: DAI APY', async function () {
      await swapEthForToken(200, USDC, user4)
      const usdcToken = await ethers.getContractAt('IERC20', USDC)
      usdcToken.connect(user4.signer).approve(THREE_POOL, ONE_MILLION)

      await deposit(pool, collateralToken, 100, user3)
      await deposit(pool, collateralToken, 100, user2)
      const initPPS = await pool.pricePerShare()
      let gasUsed = ethers.BigNumber.from(0)
      // 1 rebalance(s) / day over 30 days
      console.log('Calculating ~%APY using 1 Rebalance / Day for 30 Days')
      for (let i = 0; i < 30; i++) {
        await threePool
          .connect(user4.signer)
          .exchange(1, 0, ethers.BigNumber.from('10000000000'), ethers.BigNumber.from('1'))
        const tx = await strategy.rebalance()
        const receipt = await ethers.provider.getTransactionReceipt(tx.hash)
        gasUsed = gasUsed.add(receipt.gasUsed)
        await timeTravel(24 * 60 * 60)
        console.log(`Day ${i + 1}: ${receipt.gasUsed}`)
      }
      const finPPS = await pool.pricePerShare()
      const percentIncrease = finPPS.sub(initPPS).mul(ethers.BigNumber.from(120000)).div(initPPS).toNumber()
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
