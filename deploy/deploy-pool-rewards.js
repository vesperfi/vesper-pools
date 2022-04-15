'use strict'
const { executeOrProposeTx } = require('./deploy-strategy')
const { isDelegateOrOwner } = require('./gnosis-txn')

// TODO support multiple tokens for pool rewards
const deployFunction = async function ({ getNamedAccounts, deployments, poolConfig, targetChain }) {
  const { deploy, execute, read } = deployments
  const { deployer } = await getNamedAccounts()
  const Address = require(`../helper/${targetChain}/address`)
  const params = {
    safe: Address.MultiSig.safe,
    deployer,
    execute,
  }

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
          args: [poolProxy.address, poolConfig.rewards.tokens],
        },
      },
    },
  })

  params.governor = await read(poolConfig.contractName, {}, 'governor')
  params.isDelegateOrOwner =
    Address.MultiSig.safe === params.governor && (await isDelegateOrOwner(Address.MultiSig.safe, deployer))

  // Update pool rewards in pool
  params.methodName = 'updatePoolRewards'
  params.methodArgs = [rewardsProxy.address]
  await executeOrProposeTx(poolConfig.contractName, poolProxy.address, poolConfig.contractName, params)

  // Prepare id of deployment, next deployment will be triggered if id is changed
  const poolVersion = await read(poolConfig.contractName, {}, 'VERSION')

  deployFunction.id = `${poolConfig.contractName}-poolRewards-v${poolVersion}`

  return true
}
module.exports = deployFunction
module.exports.tags = ['deploy-pool-rewards']
