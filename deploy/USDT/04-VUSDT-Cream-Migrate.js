'use strict'

const Address = require('../../helper/ethereum/address')
const CreamStrategyUSDT = 'CreamStrategyUSDT'
const config = {
  feeCollector: Address.FEE_COLLECTOR
}
const deployFunction = async function ({getNamedAccounts, deployments}) {
  const {deploy, execute} = deployments
  const {deployer} = await getNamedAccounts()

  const poolProxy = await deployments.get('VPool')
  const oldStrategy = await deployments.get(CreamStrategyUSDT)
  const newStrategy = await deploy(CreamStrategyUSDT, {
    from: deployer,
    log: true,
    args: [poolProxy.address, Address.SWAP_MANAGER],
  })
  await execute(CreamStrategyUSDT, {from: deployer, log: true}, 'init', Address.ADDRESS_LIST_FACTORY)
  await execute(CreamStrategyUSDT, {from: deployer, log: true}, 'approveToken')
  await execute(CreamStrategyUSDT, {from: deployer, log: true}, 'updateFeeCollector', config.feeCollector)

  await execute('VPool', {from: deployer, log: true}, 'migrateStrategy', oldStrategy.address, newStrategy.address)
  
  deployFunction.id = 'VUSDT-Cream-2'
  return true
}
module.exports = deployFunction
module.exports.tags = ['VUSDT-Cream-2']
