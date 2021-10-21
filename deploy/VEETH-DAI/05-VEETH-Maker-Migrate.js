'use strict'
const VETH = require('../../helper/ethereum/poolConfig').VETHEarn
const Address = require('../../helper/ethereum/address')
const VesperMakerStrategy = 'EarnVesperMakerStrategyETH'
const config = {
  feeCollector: Address.FEE_COLLECTOR
}
const deployFunction = async function ({getNamedAccounts, deployments}) {
  const {deploy, execute} = deployments
  const {deployer} = await getNamedAccounts()

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
          args: [poolProxy.address, [Address.vaDAI, Address.VSP]],
        },
      },
    },
  })

  await execute(VETH.contractName, {from: deployer, log: true}, 'updatePoolRewards', rewardsProxy.address)
  await execute('VesperEarnDrip', {from: deployer, log: true}, 'updateGrowToken', Address.vaDAI)

  const oldStrategy = await deployments.get(VesperMakerStrategy)
  const newStrategy = await deploy(VesperMakerStrategy, {
    from: deployer,
    log: true,
    args: [poolProxy.address, Address.COLLATERAL_MANAGER,Address.SWAP_MANAGER, Address.vaDAI],
  })
  await execute(VesperMakerStrategy, {from: deployer, log: true}, 'init', Address.ADDRESS_LIST_FACTORY)
  await execute(VesperMakerStrategy, {from: deployer, log: true}, 'approveToken')
  await execute(VesperMakerStrategy, {from: deployer, log: true}, 'updateFeeCollector', config.feeCollector)
  await execute(VesperMakerStrategy, {from: deployer, log: true}, 'updateBalancingFactor', 250, 225)

  await execute('VETH', {from: deployer, log: true}, 'migrateStrategy', oldStrategy.address, newStrategy.address)
  
  deployFunction.id = 'veETH-reward-strategy-migrate'
  return true
}
module.exports = deployFunction
module.exports.tags = ['veETH-reward-strategy-migrate']
