/* eslint-disable complexity */
'use strict'
const swapper = require('./tokenSwapper')
const hre = require('hardhat')
const ethers = hre.ethers
const provider = hre.waffle.provider
const { BigNumber } = require('ethers')
const { depositTokenToAave, depositTokenToCompound } = require('./market')
const DECIMAL = BigNumber.from('1000000000000000000')
const { parseEther } = require('@ethersproject/units')
const { adjustBalance } = require('./balance')
const { getChain } = require('../utils/chains')
const { unlock, getIfExist } = require('./setupHelper')
const { NATIVE_TOKEN, DAI, MIM, ALUSD, Vesper } = require(`../../helper/${getChain()}/address`)

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
  if (token.address === NATIVE_TOKEN) {
    const wethBalance = await token.balanceOf(depositor.address)
    const requestedAmount = BigNumber.from(amount).mul(DECIMAL)
    if (requestedAmount.gt(wethBalance)) {
      await token.connect(depositor.signer).deposit({ value: requestedAmount.sub(wethBalance) })
    }
    depositAmount = requestedAmount
    await token.connect(depositor.signer).approve(pool.address, depositAmount)
    await pool.connect(depositor.signer)['deposit(uint256)'](depositAmount)
  } else if (token.address === MIM || token.address === DAI || token.address === ALUSD) {
    // Artificially performs the swap from NATIVE_TOKEN to token.address
    // By altering the token balance
    // Also simulates 0.1% linear slippage between consecutive deposits
    if (pool.depositsCount === undefined) pool.depositsCount = 0
    else pool.depositsCount++
    depositAmount = await swapper.getAmountsOut(parseEther(amount.toString()), [NATIVE_TOKEN, DAI])
    const slippage = BigNumber.from(1000).sub(pool.depositsCount)
    depositAmount = depositAmount.mul(slippage).div(1000)
    await adjustBalance(token.address, depositor.address, depositAmount)
    await token.connect(depositor.signer).approve(pool.address, depositAmount)
    await pool.connect(depositor.signer).deposit(depositAmount)
  } else {
    depositAmount = await swapper.swapEthForToken(amount, token.address, depositor)
    await token.connect(depositor.signer).approve(pool.address, depositAmount)
    await pool.connect(depositor.signer).deposit(depositAmount)
  }
  return depositAmount
}

// eslint-disable-next-line max-params
async function timeTravel(
  seconds = 6 * 60 * 60,
  blocks = 25,
  strategyType = '',
  underlayStrategy = '',
  strategies = [],
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

async function bringAboveWater(strategy, amount) {
  if (await getIfExist(strategy.instance.isUnderwater)) {
    // deposit some amount in aave/compound to bring it above water.
    if (strategy.contract.includes('AaveMaker')) {
      await depositTokenToAave(amount, DAI, strategy.instance.address)
    } else if (strategy.contract.includes('CompoundMaker')) {
      await depositTokenToCompound(amount, DAI, strategy.instance.address)
    } else {
      // Update vaDAI balance in VesperMakerStrategy
      const token = await ethers.getContractAt('IERC20', Vesper.vaDAI)
      const balance = await token.balanceOf(strategy.instance.address)
      const increaseBalanceBy = ethers.utils.parseEther('1000')
      await adjustBalance(token.address, strategy.instance.address, balance.add(increaseBalanceBy))
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

  const signer = (await ethers.getSigners())[10]
  const user = { signer, address: signer.address }
  if (collateralTokenAddress === NATIVE_TOKEN) {
    const weth = await ethers.getContractAt('TokenLike', collateralTokenAddress, signer)
    const transferAmount = ethers.utils.parseEther('5')
    await weth.deposit({ value: transferAmount })
    await weth.transfer(vault, transferAmount)
  } else {
    await swapper.swapEthForToken(5, collateralTokenAddress, user, vault)
  }
}

/**
 * Simulates harvesting in a VesperMaker strategy
 * 1. Swaps some ethers for collateral into the underlying vPool
 * 2. This causes vPool' pricePerShare to increase
 *
 * @param {object} strategy - strategy object
 */
async function harvestVesperMaker(strategy) {
  const vPool = await ethers.getContractAt('IVesperPoolTest', await strategy.instance.receiptToken())
  const collateralTokenAddress = await vPool.token()

  const signer = (await ethers.getSigners())[11]
  const user = { signer, address: signer.address }

  if (collateralTokenAddress === NATIVE_TOKEN) {
    const weth = await ethers.getContractAt('TokenLike', collateralTokenAddress, signer)
    const transferAmount = ethers.utils.parseEther('5')
    await weth.deposit({ value: transferAmount })
    await weth.transfer(vPool.address, transferAmount)
  } else {
    await swapper.swapEthForToken(5, collateralTokenAddress, user, vPool.address)
  }
}

/**
 * Simulates harvesting in a VesperCompoundXY/VesperAaveXY strategy
 * 1. Swaps some ethers for collateral into the underlying vPool
 * 2. This causes vPool' pricePerShare to increase
 *
 * @param {object} strategy - strategy object
 */
async function harvestVesperXY(strategy) {
  const vPool = await ethers.getContractAt('IVesperPoolTest', await strategy.instance.vPool())
  const collateralTokenAddress = await vPool.token()

  const signer = (await ethers.getSigners())[11]
  const user = { signer, address: signer.address }

  if (collateralTokenAddress === NATIVE_TOKEN) {
    const weth = await ethers.getContractAt('TokenLike', collateralTokenAddress, signer)
    const transferAmount = ethers.utils.parseEther('5')
    await weth.deposit({ value: transferAmount })
    await weth.transfer(vPool.address, transferAmount)
  } else {
    await swapper.swapEthForToken(5, collateralTokenAddress, user, vPool.address)
  }
}

/**
 * Simulates profit in a Vesper Pool
 *
 * @param {object} strategy - strategy object
 */
async function harvestVesper(strategy) {
  if (strategy.type === 'earnVesperMaker') {
    return harvestVesperMaker(strategy)
  }
  if (strategy.type.includes('earnVesper')) {
    const dripToken = await strategy.instance.dripToken()
    if (dripToken === ethers.utils.getAddress(Vesper.VSP)) {
      // wait 24hrs between rebalance due to vVSP's lock period
      await timeTravel(3600 * 24)
    }
  }
  return harvestYearn(strategy)
}

async function makeStrategyProfitable(strategy, token, token2 = {}) {
  const balance = await token.balanceOf(strategy.address)
  const increaseBalanceBy = ethers.utils.parseUnits('20', await token.decimals())
  try {
    // Do not fail if adjust balance fails on first token.
    await adjustBalance(token.address, strategy.address, balance.add(increaseBalanceBy))
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error while making strategy profitable', e)
  }
  // Adjust balance of token 2 if provided
  if (token2.address) {
    await adjustBalance(token2.address, strategy.address, balance.add(increaseBalanceBy))
  }
}

/**
 * Rebalance one strategy
 *
 * @param {object} strategy - strategy object
 */
async function rebalanceStrategy(strategy) {
  let tx
  try {
    if (strategy.type.includes('Maker')) {
      await bringAboveWater(strategy, 10)
    }
    if (strategy.type.toUpperCase().includes('YEARN')) {
      await harvestYearn(strategy)
    }
    if (strategy.type.includes('earnVesper') || strategy.type.includes('vesper')) {
      if (strategy.type.includes('XY')) {
        await harvestVesperXY(strategy)
      } else {
        await harvestVesper(strategy)
      }
    }
    if (strategy.type.toUpperCase().includes('ALPHA')) {
      // Alpha SafeBox has a cToken - this method calls exchangeRateCurrent on the cToken
      await strategy.instance.updateTokenRate()
    }
    if (
      strategy.type.includes('rariFuse') ||
      strategy.type.includes('earnRariFuse') ||
      strategy.type.includes('trader')
    ) {
      const cToken = await ethers.getContractAt('CToken', await strategy.instance.token())
      await cToken.accrueInterest()
    }
    tx = await strategy.instance.rebalance()
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(error)
    // ignore under water error and give one more try.
    await bringAboveWater(strategy, 50)
    tx = await strategy.instance.rebalance()
  }
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

// It will be useful for Vesper strategy if we use real Vesper pool
async function rebalanceUnderlying(strategy) {
  const vPool = await ethers.getContractAt('VPool', await strategy.vPool())
  const accountant = await ethers.getContractAt('PoolAccountant', await vPool.poolAccountant())
  const strategies = await accountant.getStrategies()

  const keeper = await unlock(Vesper.KEEPER)
  const promises = []
  for (const underlyingStrategy of strategies) {
    if ((await accountant.totalDebtOf(underlyingStrategy)).gt(0)) {
      const strategyObj = await ethers.getContractAt('IStrategy', underlyingStrategy)
      promises.push(strategyObj.connect(keeper).rebalance())
    }
  }
  return Promise.all(promises)
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

module.exports = {
  deposit,
  rebalance,
  rebalanceStrategy,
  rebalanceUnderlying,
  totalDebtOfAllStrategy,
  timeTravel,
  makeStrategyProfitable,
}
