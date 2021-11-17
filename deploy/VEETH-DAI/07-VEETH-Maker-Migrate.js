'use strict'
const Address = require('../../helper/mainnet/address')
const VesperMakerStrategy = 'EarnVesperMakerStrategyETH'
const config = {
  feeCollector: Address.FEE_COLLECTOR,
}
const deployFunction = async function ({ getNamedAccounts, deployments }) {
  const { deploy, execute } = deployments
  const { deployer } = await getNamedAccounts()

  const poolProxy = await deployments.get('VETH')

  const oldStrategy = await deployments.get(VesperMakerStrategy)
  const newStrategy = await deploy(VesperMakerStrategy, {
    from: deployer,
    log: true,
    args: [poolProxy.address, Address.COLLATERAL_MANAGER, Address.SWAP_MANAGER, Address.vaDAI],
  })

  await execute(VesperMakerStrategy, { from: deployer, log: true }, 'init', Address.ADDRESS_LIST_FACTORY)
  await execute(VesperMakerStrategy, { from: deployer, log: true }, 'approveToken')
  await execute(VesperMakerStrategy, { from: deployer, log: true }, 'updateFeeCollector', config.feeCollector)
  await execute(VesperMakerStrategy, { from: deployer, log: true }, 'updateBalancingFactor', 250, 225)

  await execute('VETH', { from: deployer, log: true }, 'migrateStrategy', oldStrategy.address, newStrategy.address)

  deployFunction.id = 'VEETH-DAI-migration-7'
  return true
}
module.exports = deployFunction
module.exports.tags = ['VEETH-DAI-migration-7']
