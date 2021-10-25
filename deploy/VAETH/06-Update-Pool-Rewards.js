'use strict'

const Address = require('../../helper/ethereum/address')
const deployFunction = async function ({getNamedAccounts, deployments}) {
  const {deploy, execute} = deployments
  const {deployer} = await getNamedAccounts()

  const poolProxy = await deployments.get('VETH')
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

  await execute('VETH', {from: deployer, log: true}, 'updatePoolRewards', rewardsProxy.address)
  
  deployFunction.id = 'VAETH-Pool-Rewards'
  return true
}
module.exports = deployFunction
module.exports.tags = ['VAETH-Pool-Rewards']
