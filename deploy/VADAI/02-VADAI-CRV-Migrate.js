'use strict'

const Address = require('../../helper/ethereum/address')
const Crv3PoolStrategyDAI = 'Crv3PoolStrategyDAI'
const {BigNumber} = require('ethers')
const DECIMAL18 = BigNumber.from('1000000000000000000')
const ONE_MILLION = DECIMAL18.mul('1000000')
const config = {
  feeCollector: Address.FEE_COLLECTOR,
  interestFee: '1500',
  debtRatio: '0',
  debtRate: ONE_MILLION.toString(),
  withdrawFee: 60,
}
const deployFunction = async function ({getNamedAccounts, deployments}) {
  const {deploy, execute} = deployments
  const {deployer} = await getNamedAccounts()

  const poolProxy = await deployments.get('VPool')
  const oldStrategy = await deployments.get(Crv3PoolStrategyDAI)
  const newStrategy = await deploy(Crv3PoolStrategyDAI, {
    from: deployer,
    log: true,
    args: [poolProxy.address, Address.SWAP_MANAGER],
  })
  console.log(poolProxy.address)
  await execute(Crv3PoolStrategyDAI, {from: deployer, log: true}, 'init', Address.ADDRESS_LIST_FACTORY)
  await execute(Crv3PoolStrategyDAI, {from: deployer, log: true}, 'approveToken')
  await execute(Crv3PoolStrategyDAI, {from: deployer, log: true}, 'updateFeeCollector', config.feeCollector)

  await execute('VPool', {from: deployer, log: true}, 'migrateStrategy', oldStrategy.address, newStrategy.address)
  
  deployFunction.id = 'VADAI-CRV-2'
  return true
}
module.exports = deployFunction
module.exports.tags = ['VADAI-CRV-2']
