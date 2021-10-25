'use strict'

const Address = require('../../helper/ethereum/address')
const deployFunction = async function ({getNamedAccounts, deployments}) {
  const {deploy} = deployments
  const {deployer} = await getNamedAccounts()

  const poolProxy = await deployments.get('VPool')
  await deploy('PoolRewards', {
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

  deployFunction.id = 'VAWBTC-Pool-Rewards'
  return true
}
module.exports = deployFunction
module.exports.tags = ['VAWBTC-Pool-Rewards']
