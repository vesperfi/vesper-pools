// Once all strategy and tests are moved to new model, this file will replace 'setupHelper.js'
// TODO simplify strategy deploy for tests
// TODO remove strategy type if we can easily
'use strict'

const hre = require('hardhat')
const ethers = hre.ethers
const provider = hre.waffle.provider
const StrategyType = require('./strategyTypes')
const { adjustBalance } = require('./balance')
const gemJoins = require('./gemJoins')
const { getChain, getChainData } = require('./chains')
const chain = getChain()
const Address = getChainData().address
hre.address = Address

// Contract names
const CToken = 'CToken'
const TokenLike = 'TokenLikeTest'
const CollateralManager = 'CollateralManager'

/**
 * @typedef {object} User
 * @property {any} signer - ethers.js signer instance of user
 * @property {string} address - user account address
 */

async function executeIfExist(fn, param) {
  if (typeof fn === 'function') {
    if (param) {
      await fn(param)
    } else {
      await fn()
    }
  }
}

async function getIfExist(fn, param) {
  if (typeof fn === 'function') {
    if (param) {
      return fn(param)
    }
    return fn()
  }
  return Promise.resolve()
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
  let contractName
  try {
    // Try to read artifact, if success then 'name' is valid input for deploy.
    await hre.artifacts.readArtifact(name)
    contractName = name
  } catch (error) {
    // Error will be thrown if more than 1 artifacts exist with same name.
    // Get all artifact paths. '_getArtifactPathNoError' is custom method
    const artifactPaths = await hre.artifacts._getArtifactPathNoError(name)
    // Get path which has chain and given 'name' in path
    let artifactPath = artifactPaths.filter(path => path.includes(chain))[0]
    // If not such path exist then use the first path from all paths
    if (!artifactPath) {
      artifactPath = artifactPaths[0]
    }
    contractName = artifactPath
  }
  const contractFactory = await ethers.getContractFactory(contractName)
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
 * Setups a local Vesper Pool for strategies that use it as underlying
 *
 * @param {string} collateralToken Address of collateralToken
 * @returns {object} Pool Contract instance
 */
async function setupVesperPool(collateralToken = Address.DAI) {
  const token = await ethers.getContractAt('IERC20Metadata', collateralToken)
  const tokenName = await token.symbol()
  const poolParams = [`v${tokenName} Pool`, `v${tokenName}`, collateralToken]
  const vPool = await deployContract('VPool', poolParams)
  const accountant = await deployContract('PoolAccountant')
  await accountant.init(vPool.address)
  await vPool.initialize(...poolParams, accountant.address)
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
        // For earn Vesper Maker growPool should be same as receiptToken
        growPool = { address: strategy.constructorArgs.receiptToken }
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
 * Create and configure a EarnVesper Strategy.
 * Using an up-to-date underlying vPool and VSP rewards enabled
 *
 * @param {object} strategy  Strategy config object
 * @param {object} poolAddress pool address
 * @param {object} options extra params
 * @returns {object} Strategy instance
 */
async function createEarnVesperStrategy(strategy, poolAddress, options) {
  const underlyingVesperPool = await ethers.getContractAt('IVesperPool', strategy.constructorArgs.receiptToken)
  const collateralToken = await underlyingVesperPool.token()

  if (!options.vPool) {
    options.vPool = await setupVesperPool(collateralToken)
    const TOTAL_REWARD = ethers.utils.parseUnits('150000')
    const REWARD_DURATION = 30 * 24 * 60 * 60

    const vPoolRewards = await deployContract('PoolRewards', [])
    const rewardTokens = [Address.Vesper.VSP]
    await vPoolRewards.initialize(poolAddress, rewardTokens)
    await options.vPool.updatePoolRewards(vPoolRewards.address)

    const vsp = await ethers.getContractAt('IVSP', Address.Vesper.VSP)

    await adjustBalance(Address.Vesper.VSP, vPoolRewards.address, TOTAL_REWARD)

    const notifyMultiSignature = 'notifyRewardAmount(address[],uint256[],uint256[])'
    await vPoolRewards[`${notifyMultiSignature}`]([vsp.address], [TOTAL_REWARD], [REWARD_DURATION])
    strategy.constructorArgs.receiptToken = options.vPool.address
  }

  const strategyInstance = await deployContract(strategy.contract, [
    poolAddress,
    ...Object.values(strategy.constructorArgs),
  ])

  return strategyInstance
}

/**
 * Create and configure VesperXY Strategy.
 *
 * @param {object} strategy  Strategy config object
 * @param {object} poolAddress pool address
 * @returns {object} Strategy instance
 */
async function createVesperXYStrategy(strategy, poolAddress) {
  const TOTAL_REWARD = ethers.utils.parseUnits('150000')
  const REWARD_DURATION = 30 * 24 * 60 * 60

  const vPoolRewards = await deployContract('PoolRewards', [])
  const rewardTokens = [Address.Vesper.VSP]
  await vPoolRewards.initialize(poolAddress, rewardTokens)
  const vsp = await ethers.getContractAt('IVSP', Address.Vesper.VSP)
  await adjustBalance(Address.Vesper.VSP, vPoolRewards.address, TOTAL_REWARD)
  const notifyMultiSignature = 'notifyRewardAmount(address[],uint256[],uint256[])'
  await vPoolRewards[`${notifyMultiSignature}`]([vsp.address], [TOTAL_REWARD], [REWARD_DURATION])
  const strategyInstance = await deployContract(strategy.contract, [
    poolAddress,
    ...Object.values(strategy.constructorArgs),
  ])

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
  } else if (strategyType === StrategyType.VESPER_COMPOUND_XY || strategyType === StrategyType.VESPER_AAVE_XY) {
    instance = await createVesperXYStrategy(strategy, poolAddress, options)
  } else if (strategyType === StrategyType.EARN_VESPER) {
    instance = await createEarnVesperStrategy(strategy, poolAddress, options)
  } else {
    instance = await deployContract(strategy.contract, [poolAddress, ...Object.values(strategy.constructorArgs)])
  }
  await instance.approveToken()
  await instance.updateFeeCollector(strategy.feeCollector)

  if (strategyType.toLowerCase().includes('vesper')) {
    let underlyingPoolAddress
    if (strategyType.toLowerCase().includes('xy')) {
      underlyingPoolAddress = await instance.vPool()
    } else {
      underlyingPoolAddress = await instance.token()
    }
    // If Vesper strategy is using the pool already deployed on mainnet for tests
    // then there may be withdraw fee in pool so update withdraw fee to zero
    try {
      const underlyingPool = await ethers.getContractAt('IVesperPoolTest', underlyingPoolAddress)
      const governor = await unlock(await underlyingPool.governor())
      await underlyingPool.connect(governor).updateWithdrawFee(0)
    } catch (e) {
      // V5 pool has no updateWithdrawFee function and execution will fail.
    }
  }

  if (strategyType === StrategyType.CONVEX) {
    await instance.setRewardTokens([])
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
  // New is copy of old except that it has new instance
  const newStrategy = { ...oldStrategy }
  newStrategy.instance = instance
  return newStrategy
}

/**
 * @typedef {object} PoolData
 * @property {object} poolConfig - Pool config
 * @property {object []} strategies - Array of strategy configuration
 */

/**
 * Setup Vesper pool for testing
 *
 * @param {object} obj Current calling object aka 'this'
 * @param {PoolData} poolData Data for pool setup
 * @param {object} options optional data
 */
async function setupVPool(obj, poolData, options = {}) {
  const { poolConfig, strategies } = poolData
  const isInCache = obj.snapshot === undefined ? false : await provider.send('evm_revert', [obj.snapshot])
  if (isInCache === true) {
    // Rollback manual changes to objects
    delete obj.pool.depositsCount
    // Recreate the snapshot after rollback, reverting deletes the previous snapshot
    obj.snapshot = await provider.send('evm_snapshot')
  } else {
    obj.strategies = strategies
    obj.accountant = await deployContract('PoolAccountant')
    obj.pool = await deployContract(poolConfig.contractName, poolConfig.poolParams)

    await obj.accountant.init(obj.pool.address)
    await obj.pool.initialize(...poolConfig.poolParams, obj.accountant.address)
    await obj.pool.updateUniversalFee(poolConfig.setup.universalFee)

    await createStrategies(obj, options)
    await addStrategies(obj)
    const collateralTokenAddress = await obj.pool.token()
    obj.collateralToken = await ethers.getContractAt(TokenLike, collateralTokenAddress)
    obj.swapManager = await ethers.getContractAt('ISwapManager', Address.Vesper.SWAP_MANAGER)

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

async function getStrategyToken(strategy) {
  const name = strategy.constructorArgs.strategyName
  const address = await strategy.instance.token()
  // TODO fine tune this
  if (
    name.toLowerCase().includes('compound') ||
    strategy.type.toLowerCase().includes('compound') ||
    strategy.type.includes('traderJoe')
  ) {
    return ethers.getContractAt(CToken, address)
  }
  return ethers.getContractAt('ERC20', address)
}

module.exports = {
  deployContract,
  getUsers,
  setupVPool,
  getEvent,
  makeNewStrategy,
  createStrategy,
  unlock,
  executeIfExist,
  getIfExist,
  getStrategyToken,
}
