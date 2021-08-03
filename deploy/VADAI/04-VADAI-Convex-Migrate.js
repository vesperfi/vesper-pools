'use strict'

const Address = require('../../helper/ethereum/address')
const ConvexStrategyDAI = 'ConvexStrategyDAI'
const config = {
  feeCollector: Address.FEE_COLLECTOR
}
const deployFunction = async function ({getNamedAccounts, deployments}) {
  const {deploy, execute} = deployments
  const {deployer} = await getNamedAccounts()

  const poolProxy = await deployments.get('VPool')
  const oldStrategy = await deployments.get(ConvexStrategyDAI)
  const newStrategy = await deploy(ConvexStrategyDAI, {
    from: deployer,
    log: true,
    args: [poolProxy.address, Address.SWAP_MANAGER],
  })
  console.log(poolProxy.address)
  await execute(ConvexStrategyDAI, {from: deployer, log: true}, 'init', Address.ADDRESS_LIST_FACTORY)
  await execute(ConvexStrategyDAI, {from: deployer, log: true}, 'approveToken')
  await execute(ConvexStrategyDAI, {from: deployer, log: true}, 'updateFeeCollector', config.feeCollector)

  await execute('VPool', {from: deployer, log: true}, 'migrateStrategy', oldStrategy.address, newStrategy.address)
  
  deployFunction.id = 'VADAI-CVX-2'
  return true
}
module.exports = deployFunction
module.exports.tags = ['VADAI-CVX-2']
