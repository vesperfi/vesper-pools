'use strict'
const swapper = require('./tokenSwapper')
const IStrategy = artifacts.require('IStrategy')
const {BN, time} = require('@openzeppelin/test-helpers')

const DECIMAL = new BN('1000000000000000000')
const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'

async function executeIfExist(fn) {
  if (typeof fn === 'function') {
    await fn()
  }
}

/**
 *  Swap given ETH for given token type and deposit tokens into Vesper pool
 *
 * @param {object} pool Vepser pool instance where we want to deposit tokens
 * @param {object} token Colalteral token instance, the token you want to deposit
 * @param {number|string} amount Amount in ETH, ETH will be swapped for required token
 * @param {string} depositor User who will pay ETH and also deposit in Vesper pool
 * @returns {Promise<BN>} Promise of collateral amount which was deposited in Vesper pool
 */
async function deposit(pool, token, amount, depositor) {
  let depositAmount
  if (token.address === WETH_ADDRESS) {
    await token.deposit({value: new BN(amount).mul(new BN(DECIMAL)), from: depositor})
    depositAmount = await token.balanceOf(depositor)
  } else {
    depositAmount = await swapper.swapEthForToken(amount, token.address, depositor)
  }
  await token.approve(pool.address, depositAmount, {from: depositor})
  await pool.deposit(depositAmount, {from: depositor})
  return depositAmount
}

/**
 * rebalance in all strategies.
 *
 * @param {Array} strategies .
 */
async function rebalance(strategies) {
  for (const strategy of strategies) {
    await executeIfExist(strategy.token.exchangeRateCurrent)
    await strategy.instance.rebalance()
    await executeIfExist(strategy.token.exchangeRateCurrent)
    if (strategy.type.includes('vesper')) {
      let s = await strategy.token.strategies(0)
      s = await IStrategy.at(s)
      // TODO: do it recursive
      await s.rebalance()
    }
  }
}


async function timeTravel(seconds = 6 * 60 * 60, blocks = 25, strategyType = '', underlayStrategy = '') {
  const timeTravelFn = () => time.increase(seconds)
  const blockMineFn = async () => time.advanceBlockTo((await time.latestBlock()).add(new BN(blocks)))
  return strategyType.includes('compound') || underlayStrategy.includes('compound') ? blockMineFn() : timeTravelFn()
}

/**
 * 
 * @param {*} strategies .
 * @param {*} pool .
 * @returns {*} .
 */
async function totalDebtOfAllStrategy(strategies, pool) {
  let totalDebt = new BN('0')
  for (const strategy of strategies) {
    const strategyParams = await pool.strategy(strategy.instance.address)
    totalDebt = totalDebt.add(strategyParams.totalDebt)
  }
  return totalDebt
}

module.exports = {deposit, rebalance, totalDebtOfAllStrategy, executeIfExist, timeTravel}
