'use strict'

const Address = require('../../helper/ethereum/address')
const deployFunction = async function ({getNamedAccounts, deployments}) {
  const {deploy} = deployments
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
  console.log('rewardsProxy.address', rewardsProxy.address)
  deployFunction.id = 'VAWBTC-poolReward-2'
  return true
}
module.exports = deployFunction
module.exports.tags = ['VAWBTC-poolReward-2']
