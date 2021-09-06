'use strict'
const swapper = require('./tokenSwapper')
const hre = require('hardhat')
const ethers = hre.ethers
const provider = hre.waffle.provider
const { BigNumber } = require('ethers')
const { depositTokenToAave, depositTokenToCompound } = require('./market')
const DECIMAL = BigNumber.from('1000000000000000000')
const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
const DAI = '0x6b175474e89094c44da98b954eedeac495271d0f'
const StrategyType = require('../utils/strategyTypes')

async function executeIfExist(fn) {
  if (typeof fn === 'function') {
    await fn()
  }
}

/**
 *  Swap given ETH for given token type and deposit tokens into Vesper pool
 *
 * @param {object} pool Vesper pool instance where we want to deposit tokens
 * @param {object} token Collateral token instance, the token you want to deposit
 * @param {number|string} amount Amount in ETH, ETH will be swapped for required token
 * @param {object} depositor User who will pay ETH and also deposit in Vesper pool
 * @returns {Promise<BigNumber>} Promise of collateral amount which was deposited in Vesper pool
 */
async function deposit(pool, token, amount, depositor) {
  let depositAmount
  if (token.address === WETH_ADDRESS) {
    const wethBalance = await token.balanceOf(depositor.address)
    const requestedAmount = BigNumber.from(amount).mul(DECIMAL)
    if (requestedAmount.gt(wethBalance)) {
      await token.connect(depositor.signer).deposit({ value: requestedAmount.sub(wethBalance) })
    }
    depositAmount = requestedAmount
    await token.connect(depositor.signer).approve(pool.address, depositAmount)
    await pool.connect(depositor.signer)['deposit(uint256)'](depositAmount)
  } else {
    depositAmount = await swapper.swapEthForToken(amount, token.address, depositor)
    await token.connect(depositor.signer).approve(pool.address, depositAmount)
    await pool.connect(depositor.signer).deposit(depositAmount)
  }
  return depositAmount
}

async function bringAboveWater(strategy, amount) {
  if (strategy.instance.isUnderwater !== undefined && (await strategy.instance.isUnderwater())) {
    // deposit some amount in aave/compound to bring it above water.
    if (strategy.type === StrategyType.AAVE_MAKER) {
      await depositTokenToAave(amount, DAI, strategy.instance.address)
    } else if (strategy.type === StrategyType.COMPOUND_MAKER) {
      await depositTokenToCompound(amount, DAI, strategy.instance.address)
    }
    const lowWater = await strategy.instance.isUnderwater()
    // if still low water do a resurface
    if (lowWater) {
      try {
        await strategy.instance.resurface()
      } catch (e) {
        // ignore error
      }
    }
  }
}

/**
 * Simulates harvesting in a Yearn Vault
 * Yearn vaults don't have a predictable profit outcome so here's what we do:
 * 1. Swaps some ethers for collateral into a vault
 * 2. This causes vault' pricePerShare to increase
 *
 * @param {object} strategy - strategy object
 */
async function harvestYearn(strategy) {

  const collateralTokenAddress = await strategy.instance.collateralToken()
  const vault = await strategy.instance.receiptToken()

  const signer = await ethers.provider.getSigner(strategy.signer)

  await swapper.swapEthForToken(5, collateralTokenAddress, { signer }, vault)

}

/**
 * Rebalance one strategy
 *
 * @param {object} strategy - strategy object
 */
async function rebalanceStrategy(strategy) {
  await executeIfExist(strategy.token.exchangeRateCurrent)
  let tx
  try {
    if (strategy.type.includes('Maker')) {
      await bringAboveWater(strategy, 10)
    }
    if (strategy.type.includes('yearn')) {
      await harvestYearn(strategy)
    }
    if (strategy.type.includes('alpha')) {
      // Alpha SafeBox has a cToken - this method calls exchangeRateCurrent on the cToken
      await strategy.instance.updateTokenRate()
    }
    if (strategy.type.includes('rariFuse')) {
      const cToken = await ethers.getContractAt('CToken', strategy.token.address)
      await cToken.accrueInterest()
    }
    tx = await strategy.instance.rebalance()
  } catch (error) {
    // ignore under water error and give one more try.
    await bringAboveWater(strategy, 50)
    tx = await strategy.instance.rebalance()
  }
  await executeIfExist(strategy.token.exchangeRateCurrent)
  return tx
}

/**
 * rebalance in all strategies.
 *
 * @param {Array} strategies - list of strategies
 */
async function rebalance(strategies) {
  const txs = []
  for (const strategy of strategies) {
    const tx = await rebalanceStrategy(strategy)
    txs.push(tx)
  }
  return txs
}

// eslint-disable-next-line max-params
async function timeTravel(
  seconds = 6 * 60 * 60,
  blocks = 25,
  strategyType = '',
  underlayStrategy = '',
  strategies = []
) {
  const timeTravelFn = async function () {
    await provider.send('evm_increaseTime', [seconds])
    await provider.send('evm_mine')
  }
  const blockMineFn = async function () {
    for (let i = 0; i < blocks; i++) {
      await provider.send('evm_mine')
    }
  }
  let isCompoundStrategy = strategyType.includes('compound') || underlayStrategy.includes('compound')
  strategies.forEach(function (strategy) {
    if (strategy.type.includes('compound')) {
      isCompoundStrategy = true
    }
  })

  return isCompoundStrategy ? blockMineFn() : timeTravelFn()
}

/**
 *
 * @param {*} strategies .
 * @param {*} pool .
 * @returns {*} .
 */
async function totalDebtOfAllStrategy(strategies, pool) {
  let totalDebt = BigNumber.from(0)
  for (const strategy of strategies) {
    const strategyTotalDebt = await pool.totalDebtOf(strategy.instance.address)
    totalDebt = totalDebt.add(strategyTotalDebt)
  }
  return totalDebt
}

async function reset() {
  // eslint-disable-next-line
  console.log('Resetting Network...')
  await provider.send(
    'hardhat_reset',
    [{
      forking: {
        jsonRpcUrl: process.env.NODE_URL,
        blockNumber: process.env.BLOCK_NUMBER ? parseInt(process.env.BLOCK_NUMBER) : undefined
      }
    }]
  )
}

module.exports = { deposit, rebalance, rebalanceStrategy, totalDebtOfAllStrategy, executeIfExist, timeTravel, reset }
