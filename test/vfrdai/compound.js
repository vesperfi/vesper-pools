'use strict'

const {ethers} = require('hardhat')

const {DAI} = require('../../helper/ethereum/address')
const {rebalance, timeTravel} = require('../utils/poolOps')
const {prepareConfig} = require('./config')

const {formatEther, hexlify, parseEther, solidityKeccak256, zeroPad} = ethers.utils

describe('VRF Compound strategy', function () {
  let governor, daiGiver, user1, user2, user3, user4, user5, user6, user7
  let pool, strategies, collateralToken

  async function deposit(amount, depositor) {
    await collateralToken
      .connect(daiGiver.signer)
      .transfer(depositor.address, parseEther(amount.toString()))
    await collateralToken
      .connect(depositor.signer)
      .approve(pool.address, parseEther(amount.toString()))
    await pool
      .connect(depositor.signer)
      .deposit(parseEther(amount.toString()))
  }

  async function withdrawAll(withdrawer) {
    await pool
      .connect(withdrawer.signer)
      .withdraw(await pool.balanceOf(withdrawer.address))
  }

  async function adjustDaiBalance(address, balance) {
    const index = solidityKeccak256(['uint256', 'uint256'], [address, 2])
    const value = hexlify(zeroPad(parseEther(balance.toString()).toHexString(), 32))

    await ethers.provider.send('hardhat_setStorageAt', [DAI, index, value])
    await ethers.provider.send('evm_mine', [])
  }

  before(async function () {
    await prepareConfig()
  })

  beforeEach(async function () {
    ;[governor, daiGiver, user1, user2, user3, user4, user5, user6, user7] = this.users
    for (const user of [user1, user2, user3, user4, user5, user6, user7]) {
      await adjustDaiBalance(user.address, 0)
    }
    await adjustDaiBalance(daiGiver.address, 1000000)

    pool = this.pool
    strategies = this.strategies
    collateralToken = this.collateralToken

    const feeWhitelist = await pool.feeWhitelist()
    for (const user of [user1, user2, user3, user4, user5, user6, user7]) {
      await pool.connect(governor.signer).addInList(feeWhitelist, user.address)
    }
  })

  it('pool targets 5% APY and achieves 2% APY', async function () {
    const depositors = [user1, user2, user3, user4, user5, user6, user7]
    const deposits = [5000, 20000, 1400, 3000, 5000, 4000, 1000]
    const times = [0, 0, 0, 0, 0, 0, 0]

    await pool.startVFR(500)
    for (let i = 0; i < depositors.length; i++) {
      // Deposit
      await deposit(deposits[i], depositors[i])
      times[i] = await ethers.provider.getBlock('latest').then(block => block.timestamp)

      // Wait for 5 days
      await timeTravel(5 * 24 * 3600)

      // Hack earning rewards by directly sending DAI to the strategy
      const currentPPS = await pool.pricePerShare()
      const realTargetPPS = await pool.targetPricePerShare()
      const wantTargetPPS = await pool.targetPricePerShareForAPY(200)
      const realAmount = await pool.amountForPriceIncrease(currentPPS, realTargetPPS)
      const wantAmount = await pool.amountForPriceIncrease(currentPPS, wantTargetPPS)
      console.log(`current price per share: ${formatEther(currentPPS.toString())}`)
      console.log(`target price per share: ${formatEther(realTargetPPS.toString())}`)
      console.log(`amount to reach target price per share: ${formatEther(realAmount.toString())}`)
      console.log(`amount earned: ${formatEther(wantAmount)}`)
      await collateralToken.connect(daiGiver.signer).transfer(strategies[0].instance.address, wantAmount)

      // Rebalance
      await rebalance(strategies)

      console.log('\n')
    }

    for (let i = 0; i < depositors.length; i++) {
      await withdrawAll(depositors[i])

      const currentBalance = await collateralToken.balanceOf(depositors[i].address)
      const depositBalance = parseEther(deposits[i].toString())

      const currentTime = await ethers.provider.getBlock('latest').then(block => block.timestamp)
      const depositTime = times[i]

      const diff = currentBalance.sub(depositBalance)
      const apy = diff.mul(365 * 24 * 3600).mul('1000000000000000000').div(
        depositBalance.mul(currentTime - depositTime)
      )
      console.log(`user${i} APY = ${ethers.utils.formatEther(apy)}`)
    }
  })

  it('pool targets 5% APY and achieves 5% APY', async function () {
    const depositors = [user1, user2, user3, user4, user5, user6, user7]
    const deposits = [5000, 20000, 1400, 3000, 5000, 4000, 1000]
    const times = [0, 0, 0, 0, 0, 0, 0]

    await pool.startVFR(500)
    for (let i = 0; i < depositors.length; i++) {
      // Deposit
      await deposit(deposits[i], depositors[i])
      times[i] = await ethers.provider.getBlock('latest').then(block => block.timestamp)

      // Wait for 5 days
      await timeTravel(5 * 24 * 3600)

      // Hack earning rewards by directly sending DAI to the strategy
      const currentPPS = await pool.pricePerShare()
      const realTargetPPS = await pool.targetPricePerShare()
      const wantTargetPPS = await pool.targetPricePerShareForAPY(500)
      const realAmount = await pool.amountForPriceIncrease(currentPPS, realTargetPPS)
      const wantAmount = await pool.amountForPriceIncrease(currentPPS, wantTargetPPS)
      console.log(`current price per share: ${formatEther(currentPPS.toString())}`)
      console.log(`target price per share: ${formatEther(realTargetPPS.toString())}`)
      console.log(`amount to reach target price per share: ${formatEther(realAmount.toString())}`)
      console.log(`amount earned: ${formatEther(wantAmount)}`)
      await collateralToken.connect(daiGiver.signer).transfer(strategies[0].instance.address, wantAmount)

      // Rebalance
      await rebalance(strategies)

      console.log('\n')
    }

    for (let i = 0; i < depositors.length; i++) {
      await withdrawAll(depositors[i])

      const currentBalance = await collateralToken.balanceOf(depositors[i].address)
      const depositBalance = parseEther(deposits[i].toString())

      const currentTime = await ethers.provider.getBlock('latest').then(block => block.timestamp)
      const depositTime = times[i]

      const diff = currentBalance.sub(depositBalance)
      const apy = diff.mul(365 * 24 * 3600).mul('1000000000000000000').div(
        depositBalance.mul(currentTime - depositTime)
      )
      console.log(`user${i} APY = ${ethers.utils.formatEther(apy)}`)
    }
  })

  it('pool targets 5% APY and achieves 10% APY', async function () {
    const depositors = [user1, user2, user3, user4, user5, user6, user7]
    const deposits = [5000, 20000, 1400, 3000, 5000, 4000, 1000]
    const times = [0, 0, 0, 0, 0, 0, 0]

    await pool.startVFR(500)
    for (let i = 0; i < depositors.length; i++) {
      // Deposit
      await deposit(deposits[i], depositors[i])
      times[i] = await ethers.provider.getBlock('latest').then(block => block.timestamp)

      // Wait for 5 days
      await timeTravel(5 * 24 * 3600)

      // Hack earning rewards by directly sending DAI to the strategy
      const currentPPS = await pool.pricePerShare()
      const realTargetPPS = await pool.targetPricePerShare()
      const wantTargetPPS = await pool.targetPricePerShareForAPY(1000)
      const realAmount = await pool.amountForPriceIncrease(currentPPS, realTargetPPS)
      const wantAmount = await pool.amountForPriceIncrease(currentPPS, wantTargetPPS)
      console.log(`current price per share: ${formatEther(currentPPS.toString())}`)
      console.log(`target price per share: ${formatEther(realTargetPPS.toString())}`)
      console.log(`amount to reach target price per share: ${formatEther(realAmount.toString())}`)
      console.log(`amount earned: ${formatEther(wantAmount)}`)
      await collateralToken.connect(daiGiver.signer).transfer(strategies[0].instance.address, wantAmount)

      // Rebalance
      await rebalance(strategies)

      console.log('\n')
    }

    for (let i = 0; i < depositors.length; i++) {
      await withdrawAll(depositors[i])

      const currentBalance = await collateralToken.balanceOf(depositors[i].address)
      const depositBalance = parseEther(deposits[i].toString())

      const currentTime = await ethers.provider.getBlock('latest').then(block => block.timestamp)
      const depositTime = times[i]

      const diff = currentBalance.sub(depositBalance)
      const apy = diff.mul(365 * 24 * 3600).mul('1000000000000000000').div(
        depositBalance.mul(currentTime - depositTime)
      )
      console.log(`user${i} APY = ${ethers.utils.formatEther(apy)}`)
    }
  })

  it('pool targets 5% APY and achieves 5% APY via inconsistent earnings', async function () {
    const depositors = [user1, user2, user3, user4, user5, user6, user7]
    const deposits = [5000, 20000, 1400, 3000, 5000, 4000, 1000]
    const times = [0, 0, 0, 0, 0, 0, 0]

    await pool.startVFR(500)
    for (let i = 0; i < depositors.length; i++) {
      // Deposit
      await deposit(deposits[i], depositors[i])
      times[i] = await ethers.provider.getBlock('latest').then(block => block.timestamp)

      // Wait for 5 days
      await timeTravel(5 * 24 * 3600)

      // Hack earning rewards by directly sending DAI to the strategy
      const currentPPS = await pool.pricePerShare()
      const realTargetPPS = await pool.targetPricePerShare()
      const wantTargetPPS = await pool.targetPricePerShareForAPY((i + 1) * 100)
      const realAmount = await pool.amountForPriceIncrease(currentPPS, realTargetPPS)
      const wantAmount = await pool.amountForPriceIncrease(currentPPS, wantTargetPPS)
      console.log(`current price per share: ${formatEther(currentPPS.toString())}`)
      console.log(`target price per share: ${formatEther(realTargetPPS.toString())}`)
      console.log(`amount to reach target price per share: ${formatEther(realAmount.toString())}`)
      console.log(`amount earned: ${formatEther(wantAmount)}`)
      await collateralToken.connect(daiGiver.signer).transfer(strategies[0].instance.address, wantAmount)

      // Rebalance
      await rebalance(strategies)

      console.log('\n')
    }

    for (let i = 0; i < depositors.length; i++) {
      await withdrawAll(depositors[i])

      const currentBalance = await collateralToken.balanceOf(depositors[i].address)
      const depositBalance = parseEther(deposits[i].toString())

      const currentTime = await ethers.provider.getBlock('latest').then(block => block.timestamp)
      const depositTime = times[i]

      const diff = currentBalance.sub(depositBalance)
      const apy = diff.mul(365 * 24 * 3600).mul('1000000000000000000').div(
        depositBalance.mul(currentTime - depositTime)
      )
      console.log(`user${i} APY = ${ethers.utils.formatEther(apy)}`)
    }
  })
})
