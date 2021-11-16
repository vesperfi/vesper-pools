'use strict'

// TODO support multiple tokens for pool rewards
const deployFunction = async function ({ getNamedAccounts, deployments, poolConfig }) {
  const { deploy, execute, read } = deployments
  const { deployer } = await getNamedAccounts()

  const poolProxy = await deployments.get(poolConfig.contractName)

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

  deployFunction.id = `${poolConfig.poolParams[1]}-poolRewards-v${poolVersion}`

  return true
}
module.exports = deployFunction
module.exports.tags = ['deploy-pool-rewards']
