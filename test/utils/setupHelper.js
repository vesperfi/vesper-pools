'use strict'

const hre = require('hardhat')
const ethers = hre.ethers
const StrategyType = require('../utils/strategyTypes')

const mcdEthAJoin = '0x2F0b23f53734252Bda2277357e97e1517d6B042A'
const mcdEthCJoin = '0xF04a5cC80B1E94C69B48f5ee68a08CD2F09A7c3E'
const mcdWbtcJoin = '0xBF72Da2Bd84c5170618Fbe5914B0ECA9638d5eb5'
const mcdLinkJoin = '0xdFccAf8fDbD2F4805C174f856a317765B49E4a50'
const gemJoins = [mcdEthAJoin, mcdWbtcJoin, mcdLinkJoin, mcdEthCJoin]

// Contract names
const IVesperPool = 'IVesperPoolTest'
const CToken = 'CToken'
const TokenLike = 'TokenLikeTest'
const CollateralManager = 'CollateralManager'
let address = require('../../helper/ethereum/address')
if (process.env.CHAIN === 'polygon') {
  address =require('../../helper/polygon/address')
}
hre.address = address
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
async function deployContract(name, params = []) {
  const contractFactory = await ethers.getContractFactory(name)
  return contractFactory.deploy(...params)
}

/**
 * Add all strategies in pool
 *
 * @param {object} obj Updated test class object
 */
async function addStrategies(obj) {
  for (const strategy of obj.strategies) {
    await obj.accountant.addStrategy(strategy.instance.address, ...Object.values(strategy.config))
  }
}

/**
 * Create and configure Aave Maker strategy. Also update test class object with required data.
 *
 * @param {object} poolAddress Pool address
 * @param {object} strategyName  Strategy name
 * @param {object} options - optional parameters
 * @returns {object} Strategy instance
 */
async function createMakerStrategy(poolAddress, strategyName, options) {
  const collateralManager = options.collateralManager
    ? options.collateralManager
    : await deployContract(CollateralManager)
  const strategyInstance = await deployContract(strategyName, [
    poolAddress,
    collateralManager.address,
    address.SWAP_MANAGER,
  ])
  if (!options.skipVault) {
    await strategyInstance.createVault()
  }
  strategyInstance.collateralManager = collateralManager
  await Promise.all([strategyInstance.updateBalancingFactor(300, 250), collateralManager.addGemJoin(gemJoins)])
  return strategyInstance
}

/**
 * Create and configure Vesper Maker Strategy. Also update test class object with required data.
 *
 * @param {object} poolAddress pool address
 * @param {object} strategyName Strategy name
 * @param options
 * @param {object} vPool Vesper pool instance
 * @returns {object} Strategy instance
 */
async function createVesperMakerStrategy(poolAddress, strategyName, options) {
  const collateralManager = await deployContract(CollateralManager)
  const strategyInstance = await deployContract(strategyName, [
    poolAddress,
    collateralManager.address,
    address.SWAP_MANAGER,
    options.vPool.address,
  ])
  await strategyInstance.createVault()
  strategyInstance.collateralManager = collateralManager
  await Promise.all([strategyInstance.updateBalancingFactor(300, 250), collateralManager.addGemJoin(gemJoins)])
  const feeList = await options.vPool.feeWhitelist()
  await options.vPool.addInList(feeList, strategyInstance.address)
  return strategyInstance
}

async function createStrategy(strategy, poolAddress, options = {}) {
  const strategyType = strategy.type
  let instance
  if (
    strategyType === StrategyType.EARN_MAKER ||
    strategyType === StrategyType.AAVE_MAKER ||
    strategyType === StrategyType.COMPOUND_MAKER
  ) {
    instance = await createMakerStrategy(poolAddress, strategy.name, options)
  } else if (strategyType === StrategyType.VESPER_MAKER) {
    instance = await createVesperMakerStrategy(poolAddress, strategy.name, options)
  } else {
    instance = await deployContract(strategy.name, [poolAddress, address.SWAP_MANAGER])
  }
  await instance.init(address.ADDRESS_LIST_FACTORY)
  await instance.approveToken()
  await instance.updateFeeCollector(strategy.feeCollector)
  const strategyTokenAddress = await instance.token()
  const strategyTokenName =
    strategyType === StrategyType.VESPER_MAKER ? IVesperPool : strategyType.includes('compound') ? CToken : TokenLike

  if (strategyType === StrategyType.CURVE) {
    // alias token.balanceOf to internal method for LP Balance
    strategy.token = {
      // eslint-disable-next-line no-unused-vars
      async balanceOf(intentionallyDiscarded) {
        return instance.totalLp()
      },
    }
  } else {
    strategy.token = await ethers.getContractAt(strategyTokenName, strategyTokenAddress)
  }
  return instance
}
/**
 * Create strategies instances and set it in test class object
 *
 * @param {object} obj Test class object
 * @param {object} options optional parameters
 */
async function createStrategies(obj, options) {
  for (const strategy of obj.strategies) {
    const instance = await createStrategy(strategy, obj.pool.address, options)
    strategy.instance = instance
  }
}

/**
 * Make a new strategy using old strategy for a pool
 *
 * @param {object} oldStrategy - old strategy object to create a new strategy
 * @param {string} poolAddress - pool address
 * @param {object} _options - optional parameters
 * @returns {object} new strategy object
 */
async function makeNewStrategy(oldStrategy, poolAddress, _options) {
  const options = {
    collateralManager: oldStrategy.instance.collateralManager,
    ..._options,
  }
  const instance = await createStrategy(oldStrategy, poolAddress, options)
  const newStrategy = {
    instance,
    token: oldStrategy.token,
    type: oldStrategy.type,
  }

  return newStrategy
}

/**
 * @typedef {object} PoolData
 * @property {object} poolConfig - Pool config
 * @property {object []} strategies - Array of strategy configuration
 * @property {object} [vPool] - Optional. Vesper pool instance
 * @property {string} feeCollector - Fee collector address of pool
 */

/**
 * Setup Vesper pool for testing
 *
 * @param {object} obj Current calling object aka 'this'
 * @param {PoolData} poolData Data for pool setup
 * @param {string} addressListFactory factory address
 * @param {string} swapManager .
 */
async function setupVPool(obj, poolData) {
  const {poolConfig, strategies, vPool, feeCollector} = poolData
  obj.strategies = strategies
  obj.feeCollector = feeCollector
  obj.pool = await deployContract(poolConfig.contractName, poolConfig.poolParams)
  obj.accountant = await deployContract('PoolAccountant')
  
  await obj.accountant.init(obj.pool.address)
  await obj.pool.initialize(...poolConfig.poolParams, obj.accountant.address, address.ADDRESS_LIST_FACTORY)
  const options = {
    vPool,
  }
  await createStrategies(obj, options)
  await addStrategies(obj)
  await obj.pool.updateFeeCollector(feeCollector)
  const collateralTokenAddress = await obj.pool.token()
  obj.collateralToken = await ethers.getContractAt(TokenLike, collateralTokenAddress)

  obj.swapManager = await ethers.getContractAt('ISwapManager', address.SWAP_MANAGER)
}

/**
 * Get first event for a transaction
 *
 * @param {object} txnObj transaction object
 * @param {object} contractInstance contract instance which generate an event
 * @param {string} eventName event name
 * @returns {object} an event object
 */
async function getEvent(txnObj, contractInstance, eventName) {
  const txnData = await txnObj.wait()
  const events = txnData.events.filter(event => event.address === contractInstance.address)
  // in case more than one events are found.
  const decodedEvents = events.map(function (event) {
    try {
      // Events from same contract with different name will fail
      return contractInstance.interface.decodeEventLog(eventName, event.data)
    } catch (e) {
      // ignore decoding error as it will fail for events with different name than requested
      return undefined
    }
  })
  // Find 1st event
  return decodedEvents.find(event => !!event)
}

module.exports = {deployContract, getUsers, setupVPool, getEvent, makeNewStrategy, createStrategy}
