// Once all strategy and tests are moved to new model, this file will replace 'setupHelper.js'
// TODO simplify strategy deploy for tests
// TODO remove strategy type if we can easily
'use strict'

const hre = require('hardhat')
const ethers = hre.ethers
const provider = hre.waffle.provider
const { smock } = require('@defi-wonderland/smock')
const StrategyType = require('./strategyTypes')
const chainData = require('./chains').getChainData()
const Address = chainData.address
hre.address = Address

const mcdEthAJoin = '0x2F0b23f53734252Bda2277357e97e1517d6B042A'
const mcdEthCJoin = '0xF04a5cC80B1E94C69B48f5ee68a08CD2F09A7c3E'
const mcdWbtcJoin = '0xBF72Da2Bd84c5170618Fbe5914B0ECA9638d5eb5'
const mcdLinkJoin = '0xdFccAf8fDbD2F4805C174f856a317765B49E4a50'
const mcdUniAJoin = '0x3BC3A58b4FC1CbE7e98bB4aB7c99535e8bA9b8F1'
const gemJoins = [mcdEthAJoin, mcdWbtcJoin, mcdLinkJoin, mcdEthCJoin, mcdUniAJoin]

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

async function executeIfExist(fn) {
  if (typeof fn === 'function') {
    await fn()
  }
}

/**
 *  Get all users from node
 *
 * @returns {User[]} Users array
 */
async function getUsers() {
  const users = []
  const signers = await ethers.getSigners()
  for (const signer of signers) {
    users.push({ signer, address: signer.address })
  }
  return users
}

/**
 *
 * @param {string} _address - address to be unlocked
 * @returns {object} - Unlocked Signer object
 */
async function unlock(_address) {
  await hre.network.provider.request({
    method: 'hardhat_impersonateAccount',
    params: [_address],
  })
  await hre.network.provider.request({
    method: 'hardhat_setBalance',
    params: [_address, ethers.utils.hexStripZeros(ethers.utils.parseEther('1').toHexString())],
  })
  return ethers.getSigner(_address)
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

async function setupVDAIPool() {
  const vDAI = chainData.poolConfig.VDAI
  const vPool = await deployContract(vDAI.contractName, vDAI.poolParams)
  const accountant = await deployContract('PoolAccountant')
  await accountant.init(vPool.address)
  await vPool.initialize(...vDAI.poolParams, accountant.address)
  return vPool
}

/**
 * Setup Vesper Earn Drip Pool for testing
 *
 /**
 * Create strategies instances and set it in test class object
 *
 * @param {object}  obj Test class object
 * @param {object} options optional parameters
 */
async function setupEarnDrip(obj, options) {
  for (const strategy of obj.strategies) {
    if (strategy.type.toUpperCase().includes('EARN')) {
      let growPool
      if (strategy.type === 'earnVesperMaker') {
        growPool = await setupVDAIPool()
      } else {
        growPool = options.growPool ? options.growPool : { address: ethers.constants.AddressZero }
      }
      const vesperEarnDrip = await deployContract('VesperEarnDrip', [])
      const rewardTokens =
        growPool.address === ethers.constants.AddressZero
          ? [...('tokens' in options ? options.tokens : [])]
          : [growPool.address]
      if (rewardTokens.length > 0) {
        await vesperEarnDrip.initialize(obj.pool.address, rewardTokens)
        if (growPool.address !== ethers.constants.AddressZero) await vesperEarnDrip.updateGrowToken(growPool.address)
        await obj.pool.updatePoolRewards(vesperEarnDrip.address)
        break
      }
    }
  }
}

/**
 * Create and configure Aave Maker strategy. Also update test class object with required data.
 *
 * @param {object} strategy  Strategy config object
 * @param {object} poolAddress Pool address
 * @param {object} options - optional parameters
 * @returns {object} Strategy instance
 */
async function createMakerStrategy(strategy, poolAddress, options) {
  const collateralManager = options.collateralManager
    ? options.collateralManager
    : await deployContract(CollateralManager)
  const strategyInstance = await deployContract(strategy.contract, [
    poolAddress,
    collateralManager.address,
    ...Object.values(strategy.constructorArgs),
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
 * @param {object} strategy  Strategy config object
 * @param {object} poolAddress pool address
 * @param {object} options extra params
 * @returns {object} Strategy instance
 */
async function createVesperMakerStrategy(strategy, poolAddress, options) {
  // For Earn VesperMaker, make sure growToken and receiptToken aka vPool is same
  if (strategy.type.toUpperCase().includes('EARN')) {
    const pool = await ethers.getContractAt('VPool', poolAddress)
    const earnDrip = await ethers.getContractAt('VesperEarnDrip', await pool.poolRewards())
    const growToken = await earnDrip.growToken()
    if (!options.vPool || growToken !== options.vPool.address) {
      options.vPool = await ethers.getContractAt('VPool', growToken)
    }
  }
  // For VesperMaker if no vPool and then deploy one vDAI pool
  if (!options.vPool) {
    options.vPool = await setupVDAIPool()
  }
  // For test purpose we will not use receiptToken defined in config. Update vPool in config
  strategy.constructorArgs.receiptToken = options.vPool.address

  const collateralManager = options.collateralManager
    ? options.collateralManager
    : await deployContract(CollateralManager)

  const strategyInstance = await deployContract(strategy.contract, [
    poolAddress,
    collateralManager.address,
    ...Object.values(strategy.constructorArgs),
  ])
  if (!options.skipVault) {
    await strategyInstance.createVault()
  }
  strategyInstance.collateralManager = collateralManager
  await Promise.all([strategyInstance.updateBalancingFactor(300, 250), collateralManager.addGemJoin(gemJoins)])

  await options.vPool.addToFeeWhitelist(strategyInstance.address)

  return strategyInstance
}

// eslint-disable-next-line complexity
async function createStrategy(strategy, poolAddress, options = {}) {
  const strategyType = strategy.type
  let instance
  if (
    strategyType === StrategyType.EARN_MAKER ||
    strategyType === StrategyType.AAVE_MAKER ||
    strategyType === StrategyType.COMPOUND_MAKER
  ) {
    instance = await createMakerStrategy(strategy, poolAddress, options)
  } else if (strategyType === StrategyType.VESPER_MAKER || strategyType === StrategyType.EARN_VESPER_MAKER) {
    instance = await createVesperMakerStrategy(strategy, poolAddress, options)
  } else {
    instance = await deployContract(strategy.contract, [poolAddress, ...Object.values(strategy.constructorArgs)])
  }
  await instance.approveToken()
  await instance.updateFeeCollector(strategy.feeCollector)
  const strategyTokenAddress = await instance.token()
  const strategyTokenName =
    strategyType === StrategyType.VESPER_MAKER || strategyType === StrategyType.EARN_VESPER
      ? IVesperPool
      : strategyType.includes('compound') || strategyType === StrategyType.EARN_COMPOUND
      ? CToken
      : TokenLike
  if (
    strategyType === StrategyType.CURVE ||
    strategyType === StrategyType.CONVEX ||
    strategyType === StrategyType.EARN_CURVE
  ) {
    // alias token.balanceOf to internal method for LP Balance
    strategy.token = {
      // eslint-disable-next-line no-unused-vars
      async balanceOf(intentionallyDiscarded) {
        return instance.totalLp()
      },
    }
    if (strategyType === StrategyType.CONVEX) {
      await instance.setRewardTokens([])
    }
  } else {
    strategy.token = await ethers.getContractAt(strategyTokenName, strategyTokenAddress)
    if (strategyTokenName === IVesperPool) {
      // TODO when 3.1.0 pools are deployed and used as receiptToken in VesperXXX strategy then
      // we will have to fix below config
      // Mock feeWhitelist to withdraw without fee in case of Earn Vesper strategies
      const mock = await smock.fake('IAddressList', { address: await strategy.token.feeWhitelist() })
      // Pretend any address is whitelisted for withdraw without fee
      mock.contains.returns(true)
    }
  }
  // Earn strategies require call to approveGrowToken
  await executeIfExist(instance.approveGrowToken)

  // This is now a required setup step
  await instance.setupOracles()
  return instance
}
/**
 * Create strategies instances and set it in test class object
 *
 * @param {object} obj Test class object
 * @param {object} options optional parameters
 */
async function createStrategies(obj, options) {
  await setupEarnDrip(obj, options)
  for (const strategy of obj.strategies) {
    strategy.instance = await createStrategy(strategy, obj.pool.address, options)
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
 * @param {object} options optional data
 */
async function setupVPool(obj, poolData, options = {}) {
  const { poolConfig, strategies, vPool, feeCollector } = poolData
  const isInCache = obj.snapshot === undefined ? false : await provider.send('evm_revert', [obj.snapshot])
  if (isInCache === true) {
    // Recreate the snapshot after rollback, reverting deletes the previous snapshot
    obj.snapshot = await provider.send('evm_snapshot')
  } else {
    obj.strategies = strategies
    obj.feeCollector = feeCollector
    obj.accountant = await deployContract('PoolAccountant')
    obj.pool = await deployContract(poolConfig.contractName, poolConfig.poolParams)

    await obj.accountant.init(obj.pool.address)
    await obj.pool.initialize(...poolConfig.poolParams, obj.accountant.address)
    options.vPool = vPool

    await createStrategies(obj, options)
    await addStrategies(obj)
    await obj.pool.updateFeeCollector(feeCollector)
    const collateralTokenAddress = await obj.pool.token()
    obj.collateralToken = await ethers.getContractAt(TokenLike, collateralTokenAddress)
    obj.swapManager = await ethers.getContractAt('ISwapManager', Address.SWAP_MANAGER)

    // Must wait an hour for oracles to be effective, unless they were created before the strategy
    await provider.send('evm_increaseTime', [3600])
    await provider.send('evm_mine')

    // Save snapshot ID for reuse in consecutive tests
    obj.snapshot = await provider.send('evm_snapshot')
  }
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

module.exports = {
  deployContract,
  getUsers,
  setupVPool,
  getEvent,
  makeNewStrategy,
  createStrategy,
  unlock,
}
