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

let swapManager

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
    await obj.pool.addStrategy(strategy.instance.address, ...Object.values(strategy.config))
  }
}

/**
 * Create and configure Aave Maker strategy. Also update test class object with required data.
 *
 * @param {object} obj Test class object
 * @param {object} strategyName  Strategy name
 * @returns {object} Strategy instance
 */
async function createMakerStrategy(obj, strategyName) {
  const collateralManager = await deployContract(CollateralManager)
  const strategyInstance = await deployContract(strategyName, [
    obj.pool.address,
    collateralManager.address,
    swapManager.address,
  ])
  await strategyInstance.createVault()  
  strategyInstance.collateralManager = collateralManager
  await Promise.all([strategyInstance.updateBalancingFactor(300, 250), collateralManager.addGemJoin(gemJoins)])
  return strategyInstance
}

/**
 *  Create and configure Vesper Maker Strategy. Also update test class object with required data.
 *
 * @param {object} obj Test class object
 * @param {object} strategyName Strategy name
 * @param {object} vPool Vesper pool instance
 * @returns {object} Strategy instance
 */
async function createVesperMakerStrategy(obj, strategyName, vPool) {
  const collateralManager = await deployContract(CollateralManager)
  const strategyInstance = await deployContract(strategyName, [
    obj.pool.address,
    collateralManager.address,
    swapManager.address,
    vPool.address,
  ])
  await strategyInstance.createVault()
  strategyInstance.collateralManager = collateralManager
  await Promise.all([strategyInstance.updateBalancingFactor(300, 250), collateralManager.addGemJoin(gemJoins)])
  const feeList = await vPool.feeWhitelist()
  await vPool.addInList(feeList, strategyInstance.address)
  return strategyInstance
}

/**
 * Create strategy instance and set it in test class object
 *
 * @param {object} obj Test class object
 * @param {object} [vPool] Vesper pool object
 */
async function createStrategies(obj, vPool) {
  const SWAP = await ethers.getContractFactory('SwapManager')
  swapManager = await SWAP.deploy()
  await swapManager.deployed()
  for (const strategy of obj.strategies) {
    const strategyType = strategy.type
    if (strategyType === StrategyType.AAVE_MAKER || strategyType === StrategyType.COMPOUND_MAKER) {
      strategy.instance = await createMakerStrategy(obj, strategy.name)
    } else if (strategyType === StrategyType.VESPER_MAKER) {
      strategy.instance = await createVesperMakerStrategy(obj, strategy.name, vPool)
    } else {
      strategy.instance = await deployContract(strategy.name, [obj.pool.address, swapManager.address])
    }
    await strategy.instance.init()
    await strategy.instance.approveToken()
    await strategy.instance.updateFeeCollector(strategy.feeCollector)
    const strategyTokenAddress = await strategy.instance.token()
    const strategyTokenName =
      strategyType === StrategyType.VESPER_MAKER ? IVesperPool : strategyType.includes('compound') ? CToken : TokenLike

    if (strategyType === StrategyType.CURVE) {
      // alias token.balanceOf to internal method for LP Balance
      strategy.token = {
        // eslint-disable-next-line no-unused-vars
        async balanceOf(intentionallyDiscarded) {
          return strategy.instance.totalLp()
        },
      }
    } else {
      strategy.token = await ethers.getContractAt(strategyTokenName, strategyTokenAddress)
    }
  }
}

/**
 * @typedef {object} PoolData
 * @property {string} poolName - Pool name
 * @property {object []} strategies - Array of strategy configuration
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
  await obj.pool.init()
  await createStrategies(obj, vPool)
  await addStrategiesInPool(obj)
  await obj.pool.updateFeeCollector(feeCollector)
  const collateralTokenAddress = await obj.pool.token()
  obj.collateralToken = await ethers.getContractAt(TokenLike, collateralTokenAddress)
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
  const decodedEvents =  events.map(function (event) {
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

module.exports = {deployContract, getUsers, setupVPool, getEvent}
