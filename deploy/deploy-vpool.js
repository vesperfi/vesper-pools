'use strict'

const ethers = require('ethers')

const PoolAccountant = 'PoolAccountant'

const deployFunction = async function ({ getNamedAccounts, deployments, poolConfig }) {
  const { deploy, execute, read } = deployments
  const { deployer } = await getNamedAccounts()
  const setup = poolConfig.setup
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
          args: [...poolConfig.poolParams, accountantProxy.address, setup.addressListFactory],
        },
      },
    },
  })

  // Initialize PoolAccountant with pool proxy address
  if ((await read(PoolAccountant, {}, 'pool')) === ethers.constants.AddressZero) {
    await execute(PoolAccountant, { from: deployer, log: true }, 'init', poolProxy.address)
  }

  // Update pool fee collector and withdraw fee
  await execute(poolConfig.contractName, { from: deployer, log: true }, 'updateFeeCollector', setup.feeCollector)
  await execute(poolConfig.contractName, { from: deployer, log: true }, 'updateWithdrawFee', setup.withdrawFee)

  const rewards = poolConfig.rewards
  // Deploy pool rewards (Vesper Earn drip for Earn pools)
  const rewardsProxy = await deploy(rewards.contract, {
    from: deployer,
    log: true,
    // proxy deployment
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
      viaAdminContract: 'DefaultProxyAdmin',
      execute: {
        init: {
          methodName: 'initialize',
          args: [poolProxy.address, rewards.tokens],
        },
      },
    },
  })

  // Update pool rewards in pool
  await execute(poolConfig.contractName, { from: deployer, log: true }, 'updatePoolRewards', rewardsProxy.address)

  // Update grow token in Vesper Earn Drip contract of Earn pool
  if (poolConfig.poolParams[0].includes('Earn')) {
    await execute(rewards.contract, { from: deployer, log: true }, 'updateGrowToken', rewards.growToken)
  }

  // Prepare id of deployment, next deployment will be triggered if id is changed
  const poolVersion = await read(poolConfig.contractName, {}, 'VERSION')
  const poolAccountantVersion = await read(PoolAccountant, {}, 'VERSION')
  deployFunction.id = `${poolConfig.poolParams[1]}-v${poolVersion}_${poolAccountantVersion}`

  return true
}
module.exports = deployFunction
module.exports.tags = ['deploy-vPool']
