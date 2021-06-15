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

const swapManager = '0xC48ea9A2daA4d816e4c9333D6689C70070010174'

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
async function deployContract(name, params=[]) {
  const contractFactory = await ethers.getContractFactory(name)
  // if (params) {
  //   return contractFactory.deploy(...params)
  // }
  return contractFactory.deploy(...params)
}

/**
 * Add all strategies in pool
 *
 * @param {object} obj Updated test class object
 */
async function addStrategiesInPool(obj) {
  for (const strategy of obj.strategies) {
    await obj.pool.addStrategy(strategy.instance.address, ...Object.values(strategy.config))
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
  const strategyInstance = await deployContract(strategyName, [poolAddress, collateralManager.address, swapManager])
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
 * @param {object} vPool Vesper pool instance
 * @returns {object} Strategy instance
 */
async function createVesperMakerStrategy(poolAddress, strategyName, vPool) {
  const collateralManager = await deployContract(CollateralManager)
  const strategyInstance = await deployContract(strategyName, [
    poolAddress,
    collateralManager.address,
    swapManager,
    vPool.address,
  ])
  await strategyInstance.createVault()
  strategyInstance.collateralManager = collateralManager
  await Promise.all([strategyInstance.updateBalancingFactor(300, 250), collateralManager.addGemJoin(gemJoins)])
  const feeList = await vPool.feeWhitelist()
  await vPool.addInList(feeList, strategyInstance.address)
  return strategyInstance
}

async function createStrategy(strategy, poolAddress, options = {}) {
  const strategyType = strategy.type
  let instance
  if (strategyType === StrategyType.AAVE_MAKER || strategyType === StrategyType.COMPOUND_MAKER) {
    instance = await createMakerStrategy(poolAddress, strategy.name, options)
  } else if (strategyType === StrategyType.VESPER_MAKER) {
    instance = await createVesperMakerStrategy(poolAddress, strategy.name, options.vPool)
  } else {
    instance = await deployContract(strategy.name, [poolAddress, swapManager])
  }
  await instance.init(options.addressListFactory)
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
 */
async function setupVPool(obj, poolData, addressListFactory = '0xded8217De022706A191eE7Ee0Dc9df1185Fb5dA3') {
  const {poolConfig, strategies, vPool, feeCollector} = poolData
  obj.strategies = strategies
  obj.feeCollector = feeCollector

  obj.pool = await deployContract(poolConfig.contractName, poolConfig.poolParams)
  await obj.pool.initialize(...poolConfig.poolParams, addressListFactory)
  const options = {
    vPool,
    addressListFactory,
  }
  await createStrategies(obj, options)
  await addStrategiesInPool(obj)
  await obj.pool.updateFeeCollector(feeCollector)
  const collateralTokenAddress = await obj.pool.token()
  obj.collateralToken = await ethers.getContractAt(TokenLike, collateralTokenAddress)

  obj.swapManager = await ethers.getContractAt('ISwapManager', swapManager)
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
