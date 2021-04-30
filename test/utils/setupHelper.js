'use strict'
const IVesperPool = artifacts.require('IVesperPoolTest')
const CToken = artifacts.require('CToken')
const TokenLike = artifacts.require('TokenLikeTest')
const StrategyType = require('../utils/strategyTypes')

const mcdEthJoin = '0x2F0b23f53734252Bda2277357e97e1517d6B042A'
const mcdWbtcJoin = '0xBF72Da2Bd84c5170618Fbe5914B0ECA9638d5eb5'
const mcdLinkJoin = '0xdFccAf8fDbD2F4805C174f856a317765B49E4a50'
const gemJoins = [mcdEthJoin, mcdWbtcJoin, mcdLinkJoin]

/**
 *  Approve token in strategy via Controller's executeTransaction
 *
 * @param {object} controller Controller contract instance
 * @param {string} target Aave-Maker Strategy contract address
 */
async function approveToken(controller, target) {
  const methodSignature = 'approveToken()'
  const data = '0x'
  await controller.executeTransaction(target, 0, methodSignature, data)
}

/**
 * Create strategy instance and set it in test class object
 *
 * @param {*} obj Updated test class object
 */
async function addStrategiesInPool(obj) {
  for (const strategy of obj.strategies) {
    await obj.pool.addStrategy(strategy.instance.address, 1, ...Object.values(strategy.config))
  }
}

/**
 * Create and configure Aave Maker strategy. Also update test class object with required data.
 *
 * @param {object} obj Test class object
 * @param {object} collateralManager CollateralManager artifact
 * @param {object} strategy  Strategy artifact
 */
async function createMakerStrategy(obj, collateralManager, strategy) {
  obj.collateralManager = await collateralManager.new()
  const strategyInstance = await strategy.new(obj.pool.address, obj.collateralManager.address)
  await strategyInstance.createVault()
  obj.vaultNum = await strategyInstance.vaultNum()
  await Promise.all([strategyInstance.updateBalancingFactor(300, 250), obj.collateralManager.addGemJoin(gemJoins)])
  return strategyInstance
}

/**
 *  Create and configure Vesper Maker Strategy. Also update test class object with required data.
 *
 * @param {object} obj Test class object
 * @param {object} collateralManager CollateralManager artifact
 * @param {object} strategy Strategy artifact
 * @param {object} vPool Vesper pool instance
 */
async function createVesperMakerStrategy(obj, collateralManager, strategy, vPool) {
  obj.collateralManager = await collateralManager.new()
  const strategyInstance = await strategy.new(obj.pool.address, obj.collateralManager.address, vPool.address)
  await strategyInstance.createVault()
  obj.vaultNum = await strategyInstance.vaultNum()
  await Promise.all([strategyInstance.updateBalancingFactor(300, 250), obj.collateralManager.addGemJoin(gemJoins)])
  const feeList = await vPool.feeWhiteList()
  await vPool.addInList(feeList, strategyInstance.address)
  return strategyInstance
}

/**
 * Update withdrawqueue of strategy
 *
 * @param strategies Test class object
 * @param pool
 */
 async function updateWithdrawQueue(strategies, pool) {
  const addresses = []
 for (const strategy of strategies) {
   addresses.push(strategy.instance.address)
 }
 await pool.updateWithdrawQueue(addresses)
}

/**
 * Create strategy instance and set it in test class object
 *
 * @param {*} obj Test class object
 * @param {*} [collateralManager] CollateralManager artifact
 * @param {*} [vPool] Vesper pool object
 */
async function createStrategies(obj, collateralManager, vPool) {
  for (const strategy of obj.strategies) {
    const strategyType = strategy.type
    if (strategyType === StrategyType.AAVE_MAKER || strategyType === StrategyType.COMPOUND_MAKER) {
      strategy.instance = await createMakerStrategy(obj, collateralManager, strategy.artifact)
    } else if (strategyType === StrategyType.VESPER_MAKER) {
      strategy.instance = await createVesperMakerStrategy(obj, collateralManager, strategy.artifact, vPool)
    } else {
      strategy.instance = await strategy.artifact.new(obj.pool.address)
    }
    await strategy.instance.createGuardianList()
    await strategy.instance.approveToken()
    await strategy.instance.updateFeeCollector(strategy.feeCollector)
    const strategyTokenAddress = await strategy.instance.token()
    const strategyToken =
      strategyType === StrategyType.VESPER_MAKER ? IVesperPool : strategyType.includes('compound') ? CToken : TokenLike
    strategy.token = await strategyToken.at(strategyTokenAddress)
  }
}

/**
 * @typedef {object} PoolData
 * @property {object} pool - Pool artifact
 * @property {object} strategy - Strategy artifact
 * @property {object} [collateralManager] - CollateralManager artifact
 * @property {string} feeCollector - Fee collector address
 */

/**
 * Setup Vesper pool for testing
 *
 * @param {object} obj Current calling object aka 'this'
 * @param {PoolData} poolData Data for pool setup
 */
async function setupVPool(obj, poolData) {
  const {pool, strategies, collateralManager, vPool, feeCollector} = poolData
  obj.strategies = strategies
  obj.feeCollector = feeCollector
  obj.pool = await pool.new()
  await obj.pool.createGuardianList()
  await createStrategies(obj, collateralManager, vPool)
  await addStrategiesInPool(obj)
  await updateWithdrawQueue(obj.strategies, obj.pool)
  await obj.pool.updateFeeCollector(feeCollector)
  const collateralTokenAddress = await obj.pool.token()
  obj.collateralToken = await TokenLike.at(collateralTokenAddress)
}

module.exports = {approveToken, setupVPool}
