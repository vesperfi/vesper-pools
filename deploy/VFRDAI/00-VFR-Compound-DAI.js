'use strict'

const { BigNumber } = require('ethers')

const Address = require('../../helper/ethereum/address')
const { VFRCoverageDAI, VFRStableDAI } = require('../../helper/ethereum/poolConfig')

const DECIMAL18 = BigNumber.from('1000000000000000000')
const ONE_MILLION = DECIMAL18.mul('1000000')
const strategyConfig = {
  feeCollector: Address.FEE_COLLECTOR,
  interestFee: '1500',
  debtRatio: '9500',
  debtRate: ONE_MILLION.toString(),
  withdrawFee: 60,
}

const deployCoveragePool = async function({ getNamedAccounts, deployments }) {
  const { deploy, execute, read } = deployments
  const { deployer } = await getNamedAccounts()

  // Deploy PoolAccountant
  const accountantProxy = await deploy('PoolAccountantCoverage', {
    contract: 'PoolAccountant',
    from: deployer,
    log: true,
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
    },
  })

  // Deploy VFRCoveragePool
  const poolProxy = await deploy(VFRCoverageDAI.contractName, {
    from: deployer,
    log: true,
    args: VFRCoverageDAI.poolParams,
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
      viaAdminContract: 'DefaultProxyAdmin',
      execute: {
        init: {
          methodName: 'initialize',
          args: [...VFRCoverageDAI.poolParams, accountantProxy.address, Address.ADDRESS_LIST_FACTORY],
        },
      },
    },
  })

  // Initialize PoolAccountant
  if ((await read('PoolAccountantCoverage', {}, 'pool')) === Address.ZERO) {
    await execute('PoolAccountantCoverage', { from: deployer, log: true }, 'init', poolProxy.address)
  }

  // Deploy CompoundCoverageStrategyDAI
  const strategyName = 'CompoundCoverageStrategyDAI'
  const strategy = await deploy(strategyName, {
    from: deployer,
    log: true,
    args: [poolProxy.address, Address.SWAP_MANAGER],
  })

  await execute(strategyName, { from: deployer, log: true }, 'init', Address.ADDRESS_LIST_FACTORY)
  await execute(strategyName, { from: deployer, log: true }, 'approveToken')
  await execute(strategyName, { from: deployer, log: true }, 'updateFeeCollector', strategyConfig.feeCollector)

  // Add strategy in pool accountant
  await execute(
    'PoolAccountantCoverage',
    { from: deployer, log: true },
    'addStrategy',
    strategy.address,
    strategyConfig.interestFee,
    strategyConfig.debtRatio,
    strategyConfig.debtRate
  )

  await execute(
    VFRCoverageDAI.contractName,
    { from: deployer, log: true },
    'updateFeeCollector',
    strategyConfig.feeCollector
  )
  await execute(
    VFRCoverageDAI.contractName,
    { from: deployer, log: true },
    'updateWithdrawFee',
    strategyConfig.withdrawFee
  )

  return poolProxy
}

const deployStablePool = async function({getNamedAccounts, deployments}) {
  const { deploy, execute, read } = deployments
  const { deployer } = await getNamedAccounts()

  // Deploy PoolAccountant
  const accountantProxy = await deploy('PoolAccountantStable', {
    contract: 'PoolAccountant',
    from: deployer,
    log: true,
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
    },
  })

  // Deploy VFRStablePool
  const poolProxy = await deploy(VFRStableDAI.contractName, {
    from: deployer,
    log: true,
    args: VFRStableDAI.poolParams,
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
      viaAdminContract: 'DefaultProxyAdmin',
      execute: {
        init: {
          methodName: 'initialize',
          args: [...VFRStableDAI.poolParams, accountantProxy.address, Address.ADDRESS_LIST_FACTORY],
        },
      },
    },
  })

  // Initialize PoolAccountant
  if ((await read('PoolAccountantStable', {}, 'pool')) === Address.ZERO) {
    await execute('PoolAccountantStable', { from: deployer, log: true }, 'init', poolProxy.address)
  }

  // Deploy CompoundStableStrategyDAI
  const strategyName = 'CompoundStableStrategyDAI'
  const strategy = await deploy(strategyName, {
    from: deployer,
    log: true,
    args: [poolProxy.address, Address.SWAP_MANAGER],
  })

  await execute(strategyName, { from: deployer, log: true }, 'init', Address.ADDRESS_LIST_FACTORY)
  await execute(strategyName, { from: deployer, log: true }, 'approveToken')
  await execute(strategyName, { from: deployer, log: true }, 'updateFeeCollector', strategyConfig.feeCollector)

  // Add strategy in pool accountant
  await execute(
    'PoolAccountantStable',
    { from: deployer, log: true },
    'addStrategy',
    strategy.address,
    strategyConfig.interestFee,
    strategyConfig.debtRatio,
    strategyConfig.debtRate
  )

  await execute(
    VFRStableDAI.contractName,
    { from: deployer, log: true },
    'updateFeeCollector',
    strategyConfig.feeCollector
  )
  await execute(
    VFRStableDAI.contractName,
    { from: deployer, log: true },
    'updateWithdrawFee',
    strategyConfig.withdrawFee
  )

  return poolProxy
}

const deployFunction = async function ({ getNamedAccounts, deployments }) {
  const { deploy, execute, read } = deployments
  const { deployer } = await getNamedAccounts()

  const coveragePool = await deployCoveragePool({ getNamedAccounts, deployments })
  const stablePool = await deployStablePool({ getNamedAccounts, deployments })

  // Deploy buffer
  const buffer = await deploy('VFRBuffer', {
    from: deployer,
    log: true,
    args: [stablePool.address, coveragePool.address, 24 * 3600],
  })

  await execute(VFRCoverageDAI.contractName, { from: deployer, log: true }, 'setBuffer', buffer.address)
  await execute(VFRStableDAI.contractName, { from: deployer, log: true }, 'setBuffer', buffer.address)

  const stablePoolVersion = await read(VFRStableDAI.contractName, {}, 'VERSION')
  const stablePoolAccountantVersion = await read('PoolAccountantStable', {}, 'VERSION')
  deployFunction.id = `vfrDAI-v${stablePoolVersion}_${stablePoolAccountantVersion}`

  return true
}
module.exports = deployFunction
module.exports.tags = ['vfrDAI-3.0.12']
