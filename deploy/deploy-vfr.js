'use strict'

const ethers = require('ethers')
const PoolAccountant = 'PoolAccountant'

// Deploy VFRPool
const deployVFRPool = async function ({ getNamedAccounts, deployments, poolConfig }) {
  const { deploy, execute, read } = deployments
  const { deployer } = await getNamedAccounts()
  const setup = poolConfig.setup

  // Deploy PoolAccountant. This call will deploy ProxyAdmin, proxy and PoolAccountant
  const accountantProxy = await deploy(poolConfig.poolAccountantAlias, {
    contract: PoolAccountant,
    from: deployer,
    log: true,
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
    },
  })

  // Deploy Pool. This call will use ProxyAdmin. It will deploy proxy and Pool and also initialize pool
  const poolProxy = await deploy(poolConfig.deploymentName, {
    contract: poolConfig.contractName,
    from: deployer,
    log: true,
    args: poolConfig.poolParams, // Constructor args
    // proxy deployment
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
      viaAdminContract: 'DefaultProxyAdmin',
      execute: {
        init: {
          methodName: 'initialize',
          args: [...poolConfig.poolParams, accountantProxy.address, setup.addressListFactory],
        },
      },
    },
  })

  // Initialize PoolAccountant with pool proxy address
  if ((await read(poolConfig.poolAccountantAlias, {}, 'pool')) === ethers.constants.AddressZero) {
    await execute(poolConfig.poolAccountantAlias, { from: deployer, log: true }, 'init', poolProxy.address)
  }

  await execute(poolConfig.deploymentName, { from: deployer, log: true }, 'updateFeeCollector', setup.feeCollector)

  await execute(poolConfig.deploymentName, { from: deployer, log: true }, 'updateWithdrawFee', setup.withdrawFee)

  console.log(`Deployed ${poolConfig.contractName}`)
  return poolProxy
}

// Deploy VFR pool pair (Coverage and Stable) and VFRBuffer
const deployFunction = async function ({ getNamedAccounts, deployments, poolConfig }) {
  const { deploy, execute, read } = deployments
  const { deployer } = await getNamedAccounts()
  const coveragePoolConfig = {
    ...poolConfig.Coverage,
    ...{ poolAccountantAlias: `${PoolAccountant}Coverage` },
  }
  const coveragePool = await deployVFRPool({ getNamedAccounts, deployments, poolConfig: coveragePoolConfig })

  const stablePoolConfig = {
    ...poolConfig.Stable,
    ...{ poolAccountantAlias: `${PoolAccountant}Stable` },
  }
  const stablePool = await deployVFRPool({ getNamedAccounts, deployments, poolConfig: stablePoolConfig })

  // Deploy buffer
  const buffer = await deploy('VFRBuffer', {
    from: deployer,
    log: true,
    args: [stablePool.address, coveragePool.address, 24 * 3600],
  })

  await execute(coveragePoolConfig.deploymentName, { from: deployer, log: true }, 'setBuffer', buffer.address)
  await execute(stablePoolConfig.deploymentName, { from: deployer, log: true }, 'setBuffer', buffer.address)

  const spVersion = await read(stablePoolConfig.deploymentName, {}, 'VERSION')
  const spAccountVersion = await read('PoolAccountantStable', {}, 'VERSION')
  deployFunction.id = `${poolConfig.name}-${stablePoolConfig.deploymentName}v${spVersion}_${spAccountVersion}`

  console.log(`Deployed ${deployFunction.id}`)
  return true
}

module.exports = deployFunction
module.exports.tags = ['deploy-vfr']
