'use strict'

const Address = require('../../helper/ethereum/address')
const VesperMakerStrategy = 'VesperMakerStrategyETH'
const deployFunction = async function ({getNamedAccounts, deployments}) {
  const {deploy} = deployments
  const {deployer} = await getNamedAccounts()

  const poolProxy = await deployments.get('VETH')
  await deploy(VesperMakerStrategy, {
    from: deployer,
    log: true,
    args: [poolProxy.address, Address.COLLATERAL_MANAGER, Address.SWAP_MANAGER, Address.vaDAI],
  })

  deployFunction.id = 'VAETH-Migration-7'
  return true
}
module.exports = deployFunction
module.exports.tags = ['VAETH-Migration-7']
