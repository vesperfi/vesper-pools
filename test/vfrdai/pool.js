'use strict'

const {expect} = require('chai')
const {ethers} = require('hardhat')

const {DAI} = require('../../helper/ethereum/address')
const {rebalance, timeTravel} = require('../utils/poolOps')
const {prepareConfig} = require('./config')

const {hexlify, parseEther, solidityKeccak256, zeroPad} = ethers.utils

const one = ethers.BigNumber.from(10).pow(18)

describe('Compound VFR strategy', function () {
  let governor, daiGiver, user1, user2, user3
  let pool, strategies, collateralToken, buffer

  async function deposit(depositor, amount) {
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

  async function earnStrategyAPY(strategy, apy) {
    // Get strategy information
    const strategyInfo = await pool.strategy(strategy.instance.address)
    const fee = strategyInfo[1]
    const totalDebt = strategyInfo[4]

    // Get current time and VFR start time
    const currentTime = await getBlockTime()
    const startTime = await pool.startTime()

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

  async function poolIsWithinTarget() {
    const currentPricePerShare = await pool.pricePerShare()
    const targetPricePerShare = await pool.targetPricePerShare()
    return isCloseEnough(targetPricePerShare, currentPricePerShare)
  }

  async function getPoolAPY() {
    const startTime = (await pool.startTime()).toNumber()
    const currentTime = await getBlockTime()
    const initialPricePerShare = await pool.initialPricePerShare()
    const currentPricePerShare = await pool.pricePerShare()
    return currentPricePerShare.sub(initialPricePerShare)
      .mul(one.mul(365 * 24 * 3600))
      .div(initialPricePerShare.mul(currentTime - startTime))
  }

  async function getUserAPY(depositTx, amount) {
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
    ;[governor, daiGiver, user1, user2, user3] = this.users
    for (const user of [user1, user2, user3]) {
      // Clear the DAI balance of users
      await adjustDaiBalance(user.address, 0)
    }
    // Fund the DAI giver account
    await adjustDaiBalance(daiGiver.address, 1000000)

    pool = this.pool
    strategies = this.strategies
    collateralToken = this.collateralToken
    buffer = this.buffer

    // Do not charge withdraw fees for ease of testing
    const feeWhitelist = await pool.feeWhitelist()
    for (const user of [user1, user2, user3]) {
      await pool.connect(governor.signer).addInList(feeWhitelist, user.address)
    }
  })

  it('disallow deposits if pool is under target by more than tolerance', async function () {
    // 5% target APY with 1% tolerance
    await pool.retarget(parseEther('0.05'), parseEther('0.01'))

    const depositTx = await deposit(user1, 1000)
    expect(await pool.balanceOf(user1.address)).to.be.gt(0)

    await rebalance(strategies)
    await timeTravel(5 * 24 * 3600)

    // Each strategy earns 2% APY
    await earnStrategyAPY(strategies[0], parseEther('0.02'))
    await earnStrategyAPY(strategies[1], parseEther('0.02'))
    await rebalance(strategies)

    await pool.checkpoint()
    // predicted APY is 2%
    expect(isCloseEnough(await pool.predictedAPY(), parseEther('0.02'))).to.be.true

    // user1 earned a 2% APY
    expect(isCloseEnough(await getUserAPY(depositTx, 1000), parseEther('0.02'))).to.be.true
    // pool earned a 2% APY
    expect(isCloseEnough(await getPoolAPY(), parseEther('0.02'))).to.be.true
    // Deposits are halted
    await expect(deposit(user2, 1000)).to.be.revertedWith('pool-under-target')
  })

  it('allow deposits if pool is under target but by no more than tolerance', async function () {
    // 5% target APY with 1% tolerance
    await pool.retarget(parseEther('0.05'), parseEther('0.01'))

    const depositTx = await deposit(user1, 1000)
    expect(await pool.balanceOf(user1.address)).to.be.gt(0)
    
    await rebalance(strategies)
    await timeTravel(5 * 24 * 3600)

    // Each strategy earns 0.45% APY
    await earnStrategyAPY(strategies[0], parseEther('0.045'))
    await earnStrategyAPY(strategies[1], parseEther('0.045'))

    // The checkpoint will predict the APY based on unreported profits within the strategies
    await pool.checkpoint()
    // predicted APY is 0.45%
    expect(isCloseEnough(await pool.predictedAPY(), parseEther('0.045'))).to.be.true

    await rebalance(strategies)

    // user1 APY is 0.45%
    expect(isCloseEnough(await getUserAPY(depositTx, 1000), parseEther('0.045'))).to.be.true

    // Deposits are not halted
    await deposit(user2, 1000)
    expect(await pool.balanceOf(user2.address)).to.be.gt(0)
  })

  it('excess profits are sent to the buffer', async function () {
    // 5% target APY with 1% tolerance
    await pool.retarget(parseEther('0.05'), parseEther('0.01'))

    const depositTx = await deposit(user1, 1000)
    expect(await pool.balanceOf(user1.address)).to.be.gt(0)
    
    await rebalance(strategies)
    await timeTravel(5 * 24 * 3600)

    // Each strategy earns 0.6% APY
    await earnStrategyAPY(strategies[0], parseEther('0.06'))
    await earnStrategyAPY(strategies[1], parseEther('0.06'))

    const beforeBufferBalance = await collateralToken.balanceOf(buffer.address)
    await rebalance(strategies)
    const afterBufferBalance = await collateralToken.balanceOf(buffer.address)

    // pool should be on target
    expect(await poolIsWithinTarget()).to.be.true

    // user1 APY is 5%
    expect(isCloseEnough(await getUserAPY(depositTx, 1000), parseEther('0.05'))).to.be.true
    // pool APY is 5%
    expect(isCloseEnough(await getPoolAPY(), parseEther('0.05'))).to.be.true
    // buffer got funded the additional profits above the pool's target APY
    expect(afterBufferBalance).to.be.gt(beforeBufferBalance)
  })

  it('missed profits are taken from the buffer', async function () {
    // 5% target APY with 1% tolerance
    await pool.retarget(parseEther('0.05'), parseEther('0.01'))

    const depositTx = await deposit(user1, 1000)
    await timeTravel(5 * 24 * 3600)

    await rebalance(strategies)
    await timeTravel(5 * 24 * 3600)

    // Each strategy earns 0.1% APY
    await earnStrategyAPY(strategies[0], parseEther('0.01'))
    await earnStrategyAPY(strategies[1], parseEther('0.01'))

    // Funds the buffer
    await fundBuffer(1000)

    // The checkpoint will predict the APY based on the funds available in the buffer
    await pool.checkpoint()
    // predicted APY is 0.45%
    expect(isCloseEnough(await pool.predictedAPY(), parseEther('0.05'))).to.be.true
    
    await rebalance(strategies)

    // pool should be on target
    expect(await poolIsWithinTarget()).to.be.true
    // user1 APY is 5%
    expect(isCloseEnough(await getUserAPY(depositTx, 1000), parseEther('0.05'))).to.be.true
    // pool APY is 5%
    expect(isCloseEnough(await getPoolAPY(), parseEther('0.05'))).to.be.true
  })
})
