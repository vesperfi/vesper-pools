'use strict'

const deployFunction = async function ({ getNamedAccounts, deployments, poolConfig }) {
  const { deploy, read } = deployments
  const { deployer } = await getNamedAccounts()
  const poolProxy = await deployments.get(poolConfig.contractName)
  // Deploy pool rewards
  await deploy(poolConfig.rewards.contract, {
    from: deployer,
    log: true,
    // proxy deployment
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
      viaAdminContract: 'DefaultProxyAdmin',
      execute: {
        init: {
          methodName: 'initialize',
          args: [poolProxy.address, poolConfig.rewards.tokens],
        },
      },
    },
  })

  // Prepare id of deployment, next deployment will be triggered if id is changed
  const poolVersion = await read(poolConfig.contractName, {}, 'VERSION')

  deployFunction.id = `${poolConfig.poolParams[1]}-poolRewards-v${poolVersion}`

  return true
}
module.exports = deployFunction
module.exports.tags = ['upgrade-pool-rewards']
