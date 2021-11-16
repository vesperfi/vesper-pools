'use strict'

const Address = require('../../helper/mainnet/address')
const VesperMakerStrategy = 'VesperMakerStrategyWBTC'
const config = {
  feeCollector: Address.FEE_COLLECTOR,
}
const deployFunction = async function ({ getNamedAccounts, deployments }) {
  const { deploy, execute } = deployments
  const { deployer } = await getNamedAccounts()

  const poolProxy = await deployments.get('VPool')
  const oldStrategy = await deployments.get(VesperMakerStrategy)
  const newStrategy = await deploy(VesperMakerStrategy, {
    from: deployer,
    log: true,
    args: [poolProxy.address, Address.COLLATERAL_MANAGER, Address.SWAP_MANAGER, Address.vaDAI],
  })
  await execute(VesperMakerStrategy, { from: deployer, log: true }, 'init', Address.ADDRESS_LIST_FACTORY)
  await execute(VesperMakerStrategy, { from: deployer, log: true }, 'approveToken')
  await execute(VesperMakerStrategy, { from: deployer, log: true }, 'updateFeeCollector', config.feeCollector)
  await execute(VesperMakerStrategy, { from: deployer, log: true }, 'updateBalancingFactor', 225, 200)
  await execute(VesperMakerStrategy, { from: deployer, log: true }, 'addKeeper', Address.KEEPER)

  await execute('VPool', { from: deployer, log: true }, 'migrateStrategy', oldStrategy.address, newStrategy.address)

  deployFunction.id = 'VAWBTC-Vesper-Maker-2'
  return true
}
module.exports = deployFunction
module.exports.tags = ['VAWBTC-Vesper-Maker-2']
