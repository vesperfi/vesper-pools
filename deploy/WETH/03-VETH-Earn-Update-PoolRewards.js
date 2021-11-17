'use strict'

const Address = require('../../helper/mainnet/address')
const VETH = require('../../helper/mainnet/poolConfig').VETHEarn
const deployFunction = async function ({ getNamedAccounts, deployments }) {
  const { deploy, execute } = deployments
  const { deployer } = await getNamedAccounts()
  const poolProxy = await deployments.get('VETH')
  const rewardsProxy = await deploy('VesperEarnDrip', {
    from: deployer,
    log: true,
    // proxy deployment
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
      viaAdminContract: 'DefaultProxyAdmin',
      execute: {
        init: {
          methodName: 'initialize',
          args: [poolProxy.address, Address.DAI],
        },
      },
    },
  })
  await execute(VETH.contractName, { from: deployer, log: true }, 'updatePoolRewards', rewardsProxy.address)

  deployFunction.id = 'upgrade-poolRewards-1'
  return true
}
module.exports = deployFunction
module.exports.tags = ['upgrade-poolRewards-1']
