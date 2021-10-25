'use strict'

const Address = require('../../helper/ethereum/address')
const deployFunction = async function ({getNamedAccounts, deployments}) {
  const {deploy, execute} = deployments
  const {deployer} = await getNamedAccounts()

  const poolProxy = await deployments.get('VPool')
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
          args: [poolProxy.address, [Address.VSP]],
        },
      },
    },
  })

  await execute('VPool', {from: deployer, log: true}, 'updatePoolRewards', rewardsProxy.address)
  
  deployFunction.id = 'VADAI-Pool-Rewards'
  return true
}
module.exports = deployFunction
module.exports.tags = ['VADAI-Pool-Rewards']
