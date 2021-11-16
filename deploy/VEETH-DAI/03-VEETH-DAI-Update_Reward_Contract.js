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
          args: [poolProxy.address, [Address.DAI, Address.VSP]],
        },
      },
    },
  })
  await execute(VETH.contractName, { from: deployer, log: true }, 'updatePoolRewards', rewardsProxy.address)
  deployFunction.id = 'veETH-poolReward-1'
  return true
}
module.exports = deployFunction
module.exports.tags = ['veETH-poolReward-1']
