'use strict'

const Address = require('../helper/ethereum/address')

const PoolAccountant = 'PoolAccountant'

// TODO support multiple tokens for pool rewards
const deployFunction = async function ({ getNamedAccounts, deployments, poolConfig }) {
  const { deploy, execute, read } = deployments
  const { deployer } = await getNamedAccounts()

  // Deploy PoolAccountant. This call will deploy ProxyAdmin, proxy and PoolAccountant
  const accountantProxy = await deploy(PoolAccountant, {
    from: deployer,
    log: true,
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
    },
  })

  // Deploy Pool. This call will use ProxyAdmin. It will deploy proxy and Pool and also initialize pool
  const poolProxy = await deploy(poolConfig.contractName, {
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
          args: [...poolConfig.poolParams, accountantProxy.address, poolConfig.addressListFactory],
        },
      },
    },
  })

  // Initialize PoolAccountant with pool proxy address
  if ((await read(PoolAccountant, {}, 'pool')) === Address.ZERO) {
    await execute(PoolAccountant, { from: deployer, log: true }, 'init', poolProxy.address)
  }

  // Update pool fee collector and withdraw fee
  await execute(poolConfig.contractName, { from: deployer, log: true }, 'updateFeeCollector', poolConfig.feeCollector)
  await execute(poolConfig.contractName, { from: deployer, log: true }, 'updateWithdrawFee', poolConfig.withdrawFee)

  // Deploy pool rewards
  const rewardsProxy = await deploy('PoolRewards', {
    from: deployer,
    log: true,
    // proxy deployment
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
      viaAdminContract: 'DefaultProxyAdmin',
      execute: {
        init: {
          methodName: 'initialize',
          args: [poolProxy.address, [poolConfig.rewardsToken]],
        },
      },
    },
  })

  // Update pool rewards in pool
  await execute(poolConfig.contractName, { from: deployer, log: true }, 'updatePoolRewards', rewardsProxy.address)

  // Prepare id of deployment, next deployment will be triggered if id is changed
  const poolVersion = await read(poolConfig.contractName, {}, 'VERSION')
  const poolAccountantVersion = await read(PoolAccountant, {}, 'VERSION')
  deployFunction.id = `${poolConfig.poolParams[1]}-v${poolVersion}_${poolAccountantVersion}`

  return true
}
module.exports = deployFunction
module.exports.tags = ['deploy-vPool']
