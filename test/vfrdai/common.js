'use strict'

const { ethers } = require('hardhat')

const { DAI } = require('../../helper/ethereum/address')
const PoolConfig = require('../../helper/ethereum/poolConfig')
const { deployContract, getUsers, setupVPool } = require('../utils/setupHelper')

const { hexlify, parseEther, solidityKeccak256, zeroPad } = ethers.utils

const ONE = parseEther('1')

function prepareConfig(stableStrategies, coverageStrategies) {
  beforeEach(async function () {
    const users = await getUsers()
    this.users = users

    this.stable = {}
    await setupVPool(this.stable, {
      poolConfig: PoolConfig.VFRStableDAI,
      feeCollector: users[7].address,
      strategies: stableStrategies.map((item, i) => ({
        ...item,
        // Leave first 8 users for other testing
        feeCollector: users[i + 8].address,
      })),
    })

    this.coverage = {}
    await setupVPool(this.coverage, {
      poolConfig: PoolConfig.VFRCoverageDAI,
      feeCollector: users[7].address,
      strategies: coverageStrategies.map((item, i) => ({
        ...item,
        // Leave first 8 users for other testing
        feeCollector: users[i + 8].address,
      })),
    })

    const buffer = await deployContract('VFRBuffer', [
      this.stable.pool.address,
      this.coverage.pool.address,
      24 * 3600
    ])
    this.buffer = buffer

    this.stable.pool.setBuffer(buffer.address)
    this.coverage.pool.setBuffer(buffer.address)
  })
}

// eslint-disable-next-line max-params
async function deposit(collateralToken, pool, from, to, amount) {
  // Give DAI to the depositor
  await collateralToken
    .connect(from.signer)
    .transfer(to.address, parseEther(amount.toString()))
  // Approve the pool
  await collateralToken
    .connect(to.signer)
    .approve(pool.address, parseEther(amount.toString()))
  // Deposit
  return pool
    .connect(to.signer)
    .deposit(parseEther(amount.toString()))
}

async function withdraw(pool, from, amount = 0) {
  const _amount = amount === 0 ? await pool.balanceOf(from.address) : parseEther(amount.toString())
  return pool.connect(from.signer).withdraw(_amount)
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

async function fundBuffer(collateralToken, buffer, from, amount) {
  // Transfer DAI directly to the buffer
  await collateralToken.connect(from.signer).transfer(buffer.address, parseEther(amount.toString()))
}

function isCloseEnough(x, y, tolerance = 1000) {
  // Default tolerance .01% (eg. x is within .1% of y)
  return x.sub(y).abs().lt(y.div(tolerance))
}

async function stablePoolIsWithinTarget(stablePool) {
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
    .mul(ONE.mul(365 * 24 * 3600))
    .div(initialPricePerShare.mul(currentTime - startTime))
}

async function getUserAPY(pool, depositTx, amount) {
  const initialAmount = parseEther(amount.toString())
  const depositTime = await getBlockTime(depositTx.blockNumber)
  const currentTime = await getBlockTime()
  const currentPricePerShare = await pool.pricePerShare()
  const currentAmount = initialAmount.mul(currentPricePerShare).div(ONE)
  return currentAmount.sub(initialAmount)
    .mul(ONE.mul(365 * 24 * 3600))
    .div(initialAmount.mul(currentTime - depositTime))
}

module.exports = {
  adjustDaiBalance,
  deposit,
  withdraw,
  fundBuffer,
  getBlockTime,
  getPoolAPY,
  getUserAPY,
  isCloseEnough,
  prepareConfig,
  stablePoolIsWithinTarget
}
