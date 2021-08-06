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
    await collateralToken
      .connect(daiGiver.signer)
      .transfer(depositor.address, parseEther(amount.toString()))
    await collateralToken
      .connect(depositor.signer)
      .approve(pool.address, parseEther(amount.toString()))
    return pool
      .connect(depositor.signer)
      .deposit(parseEther(amount.toString()))
  }

  // async function withdrawAll(withdrawer) {
  //   const shares = await pool.balanceOf(withdrawer.address)
  //   if (shares.gt(0)) {
  //     await pool.connect(withdrawer.signer).withdraw(shares)
  //   }
  // }

  async function adjustDaiBalance(address, balance) {
    const index = solidityKeccak256(['uint256', 'uint256'], [address, 2])
    const value = hexlify(zeroPad(parseEther(balance.toString()).toHexString(), 32))

    await ethers.provider.send('hardhat_setStorageAt', [DAI, index, value])
    await ethers.provider.send('evm_mine', [])
  }

  async function targetPricePerShareForAPY(apy) {
    const currentTime = await ethers.provider.getBlock('latest').then(block => block.timestamp)
    const startTime = await pool.startTime()
    const initialPricePerShare = await pool.initialPricePerShare()
    const profit = initialPricePerShare.mul(apy).mul(currentTime - startTime).div(one.mul(365 * 24 * 3600))
    return initialPricePerShare.add(profit)
  }

  async function amountForPriceIncrease(strategy, fromPricePerShare, toPricePerShare) {
    if (fromPricePerShare.lt(toPricePerShare)) {
      const fee = (await pool.strategy(strategy))[1]
      const totalSupply = await pool.totalSupply()
      const fromTotalValue = fromPricePerShare.mul(totalSupply).div(one)
      const toTotalValue = toPricePerShare.mul(totalSupply).div(one)
      const amountWithoutFee = toTotalValue.sub(fromTotalValue)
      return amountWithoutFee.mul(10000).div(ethers.BigNumber.from(10000).sub(fee))
    }
    return ethers.BigNumber.from(0)
  }

  async function earnStrategy(strategy, apy) {
    const currentPricePerShare = await pool.pricePerShare()
    const targetPricePerShare = await targetPricePerShareForAPY(apy)
    const amount = await amountForPriceIncrease(strategy.instance.address, currentPricePerShare, targetPricePerShare)
    await collateralToken.connect(daiGiver.signer).transfer(strategy.instance.address, amount)
  }

  async function fundBuffer(amount) {
    await collateralToken.connect(daiGiver.signer).transfer(buffer.address, parseEther(amount.toString()))
  }

  async function poolIsWithinTarget() {
    const currentPricePerShare = await pool.pricePerShare()
    const targetPricePerShare = await pool.targetPricePerShare()
    return targetPricePerShare.sub(currentPricePerShare).abs().lt(one.div(1000000))
  }

  function isCloseEnough(x, y, tolerance = 10000) {
    // Default tolerance .01% (eg. x is within .01% of y)
    return x.sub(y).abs().lt(y.div(tolerance))
  }

  async function getBlockTime(blockNumber = 'latest') {
    return ethers.provider.getBlock(blockNumber).then(block => block.timestamp)
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
      await adjustDaiBalance(user.address, 0)
    }
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

  it('disallow deposits if pool is under target more than tolerance', async function () {
    // 5% target APY with 1% tolerance
    await pool.retarget(parseEther('0.05'), parseEther('0.01'))

    const depositTx = await deposit(user1, 1000)
    expect(await pool.balanceOf(user1.address)).to.be.gt(0)
    await timeTravel(5 * 24 * 3600)

    // Earn 2% APY
    await earnStrategy(strategies[0], parseEther('0.02'))
    await rebalance(strategies)

    // Actual APY of user1 is within .01% of 2%
    expect(isCloseEnough(await getUserAPY(depositTx, 1000), parseEther('0.02'))).to.be.true
    expect(deposit(user2, 1000)).to.be.revertedWith('pool-under-target')
  })

  it('allow deposits if pool is under target but not more than tolerance', async function () {
    // 5% target APY with 1% tolerance
    await pool.retarget(parseEther('0.05'), parseEther('0.01'))

    const depositTx = await deposit(user1, 1000)
    expect(await pool.balanceOf(user1.address)).to.be.gt(0)
    await timeTravel(5 * 24 * 3600)

    // Earn 4.5% APY
    await earnStrategy(strategies[0], parseEther('0.045'))
    await rebalance(strategies)

    // Actual APY of user1 is within .01% of 4.5%
    expect(isCloseEnough(await getUserAPY(depositTx, 1000), parseEther('0.045'))).to.be.true

    await deposit(user2, 1000)
    expect(await pool.balanceOf(user2.address)).to.be.gt(0)
  })

  it('excess profits are sent to the buffer', async function () {
    // 5% target APY with 1% tolerance
    await pool.retarget(parseEther('0.05'), parseEther('0.01'))

    const depositTx = await deposit(user1, 1000)
    await timeTravel(5 * 24 * 3600)

    // Earn 6% APY
    await earnStrategy(strategies[0], parseEther('0.06'))

    const beforeBufferBalance = await collateralToken.balanceOf(buffer.address)
    await rebalance(strategies)
    const afterBufferBalance = await collateralToken.balanceOf(buffer.address)

    // Actual APY of user1 is within .01% of 5%
    expect(isCloseEnough(await getUserAPY(depositTx, 1000), parseEther('0.05'))).to.be.true

    expect(await poolIsWithinTarget()).to.be.true
    // Actual APY of pool is within .01% of 5%
    expect(isCloseEnough(await getPoolAPY(), parseEther('0.05'))).to.be.true
    expect(afterBufferBalance).to.be.gt(beforeBufferBalance)
  })

  it('missed profits are taken from the buffer', async function () {
    // 5% target APY with 1% tolerance
    await pool.retarget(parseEther('0.05'), parseEther('0.01'))

    const depositTx = await deposit(user1, 1000)
    await timeTravel(5 * 24 * 3600)

    // Earn 3% APY
    await earnStrategy(strategies[0], parseEther('0.03'))
    await fundBuffer(1000)

    await rebalance(strategies)

    // Actual APY of user1 is within .01% of 5%
    expect(isCloseEnough(await getUserAPY(depositTx, 1000), parseEther('0.05'))).to.be.true

    expect(await poolIsWithinTarget()).to.be.true
    // Actual APY of pool is within .01% of 5%
    expect(isCloseEnough(await getPoolAPY(), parseEther('0.05'))).to.be.true
  })
})
