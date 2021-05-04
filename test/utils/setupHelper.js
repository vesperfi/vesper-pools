'use strict'

const {ethers} = require('hardhat')
const StrategyType = require('../utils/strategyTypes')

const mcdEthJoin = '0x2F0b23f53734252Bda2277357e97e1517d6B042A'
const mcdWbtcJoin = '0xBF72Da2Bd84c5170618Fbe5914B0ECA9638d5eb5'
const mcdLinkJoin = '0xdFccAf8fDbD2F4805C174f856a317765B49E4a50'
const gemJoins = [mcdEthJoin, mcdWbtcJoin, mcdLinkJoin]

// Contract names
const IVesperPool = 'IVesperPoolTest'
const CToken = 'CToken'
const TokenLike = 'TokenLikeTest'
const CollateralManager = 'CollateralManager'

/**
 * @typedef {object} User
 * @property {any} signer - ethers.js signer instance of user
 * @property {string} address - user account address
 */

/**
 *  Get all users from node
 *
 * @returns {User[]} Users array
 */
async function getUsers() {
  const users = []
  const signers = await ethers.getSigners()
  for (const signer of signers) {
    users.push({signer, address: signer.address})
  }
  return users
}

/**
 * Deploy contract
 *
 * @param {string} name Name of contract
 * @param {any[]} [params] Constructor params
 * @returns {object} Contract instance
 */
async function deployContract(name, params) {
  const contractFactory = await ethers.getContractFactory(name)
  if (params) {
    return contractFactory.deploy(...params)
  }
  return contractFactory.deploy()
}

/**
 * Add all strategies in pool
 *
 * @param {object} obj Updated test class object
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
 * @param {object} strategyName  Strategy name
 */
async function createMakerStrategy(obj, strategyName) {
  obj.collateralManager = await deployContract(CollateralManager)
  const strategyInstance = await deployContract(strategyName, [obj.pool.address, obj.collateralManager.address])
  await strategyInstance.createVault()
  obj.vaultNum = await strategyInstance.vaultNum()
  await Promise.all([strategyInstance.updateBalancingFactor(300, 250), obj.collateralManager.addGemJoin(gemJoins)])
  return strategyInstance
}

/**
 *  Create and configure Vesper Maker Strategy. Also update test class object with required data.
 *
 * @param {object} obj Test class object
 * @param {object} strategyName Strategy name
 * @param {object} vPool Vesper pool instance
 */
async function createVesperMakerStrategy(obj, strategyName, vPool) {
  obj.collateralManager = await deployContract(CollateralManager)
  const strategyInstance = await deployContract(strategyName, [
    obj.pool.address,
    obj.collateralManager.address,
    vPool.address,
  ])
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
 * @param {object[]} strategies Strategies
 * @param {object} pool Pool instance
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
 * @param {object} obj Test class object
 * @param {object} [vPool] Vesper pool object
 */
async function createStrategies(obj, vPool) {
  for (const strategy of obj.strategies) {
    const strategyType = strategy.type
    if (strategyType === StrategyType.AAVE_MAKER || strategyType === StrategyType.COMPOUND_MAKER) {
      strategy.instance = await createMakerStrategy(obj, strategy.name)
    } else if (strategyType === StrategyType.VESPER_MAKER) {
      strategy.instance = await createVesperMakerStrategy(obj, strategy.name, vPool)
    } else {
      strategy.instance = await deployContract(strategy.name, [obj.pool.address])
    }
    await strategy.instance.createGuardianList()
    await strategy.instance.approveToken()
    await strategy.instance.updateFeeCollector(strategy.feeCollector)
    const strategyTokenAddress = await strategy.instance.token()
    const strategyTokenName =
      strategyType === StrategyType.VESPER_MAKER ? IVesperPool : strategyType.includes('compound') ? CToken : TokenLike
    strategy.token = await ethers.getContractAt(strategyTokenName, strategyTokenAddress)
  }
}

/**
 * @typedef {object} PoolData
 * @property {string} poolName - Pool name
 * @property {object []} strategies - Arrayu of strategy configuration
 * @property {object} [vPool] - Optional. Vesper pool instance
 * @property {string} feeCollector - Fee collector address of pool
 */

/**
 * Setup Vesper pool for testing
 *
 * @param {object} obj Current calling object aka 'this'
 * @param {PoolData} poolData Data for pool setup
 */
async function setupVPool(obj, poolData) {
  const {poolName, strategies, vPool, feeCollector} = poolData
  obj.strategies = strategies
  obj.feeCollector = feeCollector

  obj.pool = await deployContract(poolName)
  await obj.pool.createGuardianList()
  await createStrategies(obj, vPool)
  await addStrategiesInPool(obj)

  await updateWithdrawQueue(obj.strategies, obj.pool)
  await obj.pool.updateFeeCollector(feeCollector)
  const collateralTokenAddress = await obj.pool.token()
  obj.collateralToken = await ethers.getContractAt(TokenLike, collateralTokenAddress)
}

module.exports = {deployContract, getUsers, setupVPool}
