'use strict'

const {expect} = require('chai')
const {ethers} = require('hardhat')

const {DAI} = require('../../helper/ethereum/address')
const {rebalance, timeTravel} = require('../utils/poolOps')
const {prepareConfig} = require('./config')

const {hexlify, parseEther, solidityKeccak256, zeroPad} = ethers.utils

const one = ethers.BigNumber.from(10).pow(18)

describe('Compound VFR', function () {
  let daiGiver, user1, user2, user3
  let stablePool, stableStrategies, coveragePool, coverageStrategies, collateralToken, buffer

  async function deposit(pool, depositor, amount) {
    // Give DAI to the depositor
    await collateralToken
      .connect(daiGiver.signer)
      .transfer(depositor.address, parseEther(amount.toString()))
    // Approve the pool
    await collateralToken
      .connect(depositor.signer)
      .approve(pool.address, parseEther(amount.toString()))
    // Deposit
    return pool
      .connect(depositor.signer)
      .deposit(parseEther(amount.toString()))
  }

  async function adjustDaiBalance(address, balance) {
    const index = solidityKeccak256(['uint256', 'uint256'], [address, 2])
    const value = hexlify(zeroPad(parseEther(balance.toString()).toHexString(), 32))

    // Hack the balance by directly setting the EVM storage
    await ethers.provider.send('hardhat_setStorageAt', [DAI, index, value])
    await ethers.provider.send('evm_mine', [])
  }

  async function getBlockTime(blockNumber = 'latest') {
    return ethers.provider.getBlock(blockNumber).then(block => block.timestamp)
  }

  async function earnStrategyAPY(pool, strategy, apy) {
    // Get strategy information
    const strategyInfo = await pool.strategy(strategy.instance.address)
    const fee = strategyInfo[1]
    const totalDebt = strategyInfo[4]

    // Get current time and VFR start time
    const currentTime = await getBlockTime()
    const startTime = await stablePool.startTime()

    // Compute the profit needed to achieve the requested APY
    const neededProfitWithoutFee = totalDebt.mul(apy).mul(currentTime - startTime).div(one.mul(365 * 24 * 3600))
    const neededProfit = neededProfitWithoutFee.mul(10000).div(ethers.BigNumber.from(10000).sub(fee))

    // Hacky way of earning a strategy profits by directly sending some cTokens to it
    const cdai = await ethers.getContractAt('CToken', '0x5d3a536e4d6dbd6114cc1ead35777bab948e3643')
    await collateralToken.connect(daiGiver.signer).approve(cdai.address, neededProfit)
    await cdai.connect(daiGiver.signer)['mint(uint256)'](neededProfit)

    // Hack earnings for the strategy by sending some funds directly to it
    await cdai.connect(daiGiver.signer).transfer(strategy.instance.address, await cdai.balanceOf(daiGiver.address))
  }

  async function fundBuffer(amount) {
    // Transfer DAI directly to the buffer
    await collateralToken.connect(daiGiver.signer).transfer(buffer.address, parseEther(amount.toString()))
  }

  function isCloseEnough(x, y, tolerance = 1000) {
    // Default tolerance .01% (eg. x is within .1% of y)
    return x.sub(y).abs().lt(y.div(tolerance))
  }

  async function stablePoolIsWithinTarget() {
    const currentPricePerShare = await stablePool.pricePerShare()
    const targetPricePerShare = await stablePool.targetPricePerShare()
    return isCloseEnough(targetPricePerShare, currentPricePerShare)
  }

  async function getPoolAPY(pool) {
    const startTime = (await pool.startTime()).toNumber()
    const currentTime = await getBlockTime()
    const initialPricePerShare = await pool.initialPricePerShare()
    const currentPricePerShare = await pool.pricePerShare()
    return currentPricePerShare.sub(initialPricePerShare)
      .mul(one.mul(365 * 24 * 3600))
      .div(initialPricePerShare.mul(currentTime - startTime))
  }

  async function getUserAPY(pool, depositTx, amount) {
    const initialAmount = parseEther(amount.toString())
    const depositTime = await getBlockTime(depositTx.blockNumber)
    const currentTime = await getBlockTime()
    const currentPricePerShare = await pool.pricePerShare()
    const currentAmount = initialAmount.mul(currentPricePerShare).div(one)
    return currentAmount.sub(initialAmount)
      .mul(one.mul(365 * 24 * 3600))
      .div(initialAmount.mul(currentTime - depositTime))
  }

  before(async function () {
    await prepareConfig()
  })

  beforeEach(async function () {
    ;[, daiGiver, user1, user2, user3] = this.users
    for (const user of [user1, user2, user3]) {
      // Clear the DAI balance of users
      await adjustDaiBalance(user.address, 0)
    }
    // Fund the DAI giver account
    await adjustDaiBalance(daiGiver.address, 1000000)

    stablePool = this.stable.pool
    coveragePool = this.coverage.pool
    stableStrategies = this.stable.strategies
    coverageStrategies = this.coverage.strategies
    collateralToken = this.stable.collateralToken
    buffer = this.buffer
  })

  describe('Stable pool', function () {
    it('disallow deposits if pool is under target by more than tolerance', async function () {
      // 5% target APY with 1% tolerance
      await stablePool.retarget(parseEther('0.05'), parseEther('0.01'))
  
      const depositTx = await deposit(stablePool, user1, 1000)
      expect(await stablePool.balanceOf(user1.address)).to.be.gt(0)
  
      await rebalance(stableStrategies)
      await timeTravel(5 * 24 * 3600)
  
      // Each strategy earns 2% APY
      await earnStrategyAPY(stablePool, stableStrategies[0], parseEther('0.02'))
      await earnStrategyAPY(stablePool, stableStrategies[1], parseEther('0.02'))
      await rebalance(stableStrategies)
  
      await stablePool.checkpoint()
      // predicted APY is 2%
      expect(isCloseEnough(await stablePool.predictedAPY(), parseEther('0.02'))).to.be.true
  
      // user1 earned a 2% APY
      expect(isCloseEnough(await getUserAPY(stablePool, depositTx, 1000), parseEther('0.02'))).to.be.true
      // pool earned a 2% APY
      expect(isCloseEnough(await getPoolAPY(stablePool), parseEther('0.02'))).to.be.true
      // Deposits are halted
      await expect(deposit(stablePool, user2, 1000)).to.be.revertedWith('pool-under-target')
    })
  
    it('allow deposits if pool is under target but by no more than tolerance', async function () {
      // 5% target APY with 1% tolerance
      await stablePool.retarget(parseEther('0.05'), parseEther('0.01'))
  
      const depositTx = await deposit(stablePool, user1, 1000)
      expect(await stablePool.balanceOf(user1.address)).to.be.gt(0)
      
      await rebalance(stableStrategies)
      await timeTravel(5 * 24 * 3600)
  
      // Each strategy earns 0.45% APY
      await earnStrategyAPY(stablePool, stableStrategies[0], parseEther('0.045'))
      await earnStrategyAPY(stablePool, stableStrategies[1], parseEther('0.045'))
  
      // The checkpoint will predict the APY based on unreported profits within the strategies
      await stablePool.checkpoint()
      // predicted APY is 0.45%
      expect(isCloseEnough(await stablePool.predictedAPY(), parseEther('0.045'))).to.be.true
  
      await rebalance(stableStrategies)
  
      // user1 APY is 0.45%
      expect(isCloseEnough(await getUserAPY(stablePool, depositTx, 1000), parseEther('0.045'))).to.be.true
  
      // Deposits are not halted
      await deposit(stablePool, user2, 1000)
      expect(await stablePool.balanceOf(user2.address)).to.be.gt(0)
    })
  
    it('excess profits are sent to the buffer', async function () {
      // 5% target APY with 1% tolerance
      await stablePool.retarget(parseEther('0.05'), parseEther('0.01'))
  
      const depositTx = await deposit(stablePool, user1, 1000)
      expect(await stablePool.balanceOf(user1.address)).to.be.gt(0)
      
      await rebalance(stableStrategies)
      await timeTravel(5 * 24 * 3600)
  
      // Each strategy earns 0.6% APY
      await earnStrategyAPY(stablePool, stableStrategies[0], parseEther('0.06'))
      await earnStrategyAPY(stablePool, stableStrategies[1], parseEther('0.06'))
  
      const beforeBufferBalance = await collateralToken.balanceOf(buffer.address)
      await rebalance(stableStrategies)
      const afterBufferBalance = await collateralToken.balanceOf(buffer.address)
  
      // pool should be on target
      expect(await stablePoolIsWithinTarget()).to.be.true
  
      // user1 APY is 5%
      expect(isCloseEnough(await getUserAPY(stablePool, depositTx, 1000), parseEther('0.05'))).to.be.true
      // pool APY is 5%
      expect(isCloseEnough(await getPoolAPY(stablePool), parseEther('0.05'))).to.be.true
      // buffer got funded the additional profits above the pool's target APY
      expect(afterBufferBalance).to.be.gt(beforeBufferBalance)
    })
  
    it('missed profits are taken from the buffer', async function () {
      // 5% target APY with 1% tolerance
      await stablePool.retarget(parseEther('0.05'), parseEther('0.01'))
  
      const depositTx = await deposit(stablePool, user1, 1000)
      await timeTravel(5 * 24 * 3600)
  
      await rebalance(stableStrategies)
      await timeTravel(5 * 24 * 3600)
  
      // Each strategy earns 0.1% APY
      await earnStrategyAPY(stablePool, stableStrategies[0], parseEther('0.01'))
      await earnStrategyAPY(stablePool, stableStrategies[1], parseEther('0.01'))
  
      // Funds the buffer
      await fundBuffer(1000)
  
      // The checkpoint will predict the APY based on the funds available in the buffer
      await stablePool.checkpoint()
      // predicted APY is 0.45%
      expect(isCloseEnough(await stablePool.predictedAPY(), parseEther('0.05'))).to.be.true
      
      await rebalance(stableStrategies)
  
      // pool should be on target
      expect(await stablePoolIsWithinTarget()).to.be.true
      // user1 APY is 5%
      expect(isCloseEnough(await getUserAPY(stablePool, depositTx, 1000), parseEther('0.05'))).to.be.true
      // pool APY is 5%
      expect(isCloseEnough(await getPoolAPY(stablePool), parseEther('0.05'))).to.be.true
    })
  })

  describe('Coverage pool', function () {
    it('profits are sent to buffer until it reaches target', async function () {
      // 1% target APY with 0.1% tolerance
      await stablePool.retarget(parseEther('0.01'), parseEther('0.001'))

      await deposit(stablePool, user1, 1000)
      await rebalance(stableStrategies)
      await deposit(coveragePool, user1, 1000)
      await rebalance(coverageStrategies)

      await timeTravel(24 * 3600)

      await earnStrategyAPY(coveragePool, coverageStrategies[0], parseEther('0.02'))
      await rebalance(coverageStrategies)

      // All profits were sent to the buffer
      expect(isCloseEnough(await coveragePool.pricePerShare(), parseEther('1'), 100000)).to.be.true

      await stablePool.checkpoint()
      expect(await collateralToken.balanceOf(buffer.address)).to.be.gt(0)
      // Stable pool achieved target via the buffer
      expect(isCloseEnough(await stablePool.predictedAPY(), parseEther('0.01'))).to.be.true
    })

    it('above target buffer funds can be requested by the coverage pool', async function () {
      // 1% target APY with 0.1% tolerance
      await stablePool.retarget(parseEther('0.01'), parseEther('0.001'))

      await deposit(stablePool, user1, 1000)
      await rebalance(stableStrategies)
      await deposit(coveragePool, user1, 1000)
      await rebalance(coverageStrategies)

      await timeTravel(24 * 3600)

      await earnStrategyAPY(stablePool, stableStrategies[0], parseEther('0.04'))
      await earnStrategyAPY(stablePool, stableStrategies[1], parseEther('0.04'))
      await rebalance(stableStrategies)
      await rebalance(coverageStrategies)

      await stablePool.checkpoint()
      expect(await collateralToken.balanceOf(buffer.address)).to.be.gt(0)
      // Stable pool achieved target via the buffer
      expect(isCloseEnough(await stablePool.predictedAPY(), parseEther('0.01'))).to.be.true

      // Above target buffer funds are relayed to the coverage pool
      expect(isCloseEnough(await coveragePool.pricePerShare(), parseEther('1'), 100000)).to.be.false
    })
  })
})
