'use strict'

const Address = require('../../helper/ethereum/address')
const YearnStrategyDAI = 'YearnStrategyDAI'
const PoolAccountant = 'PoolAccountant'
const {BigNumber} = require('ethers')
const DECIMAL18 = BigNumber.from('1000000000000000000')
const ONE_MILLION = DECIMAL18.mul('1000000')
const config = {
  feeCollector: Address.FEE_COLLECTOR,
  interestFee: '1500',
  debtRatio: '1500',
  debtRate: ONE_MILLION.toString(),
  withdrawFee: 60,
}
const deployFunction = async function ({getNamedAccounts, deployments}) {
  const {deploy, execute} = deployments
  const {deployer} = await getNamedAccounts()

  const poolProxy = await deployments.get('VPool')
  console.log(poolProxy.address)
  const deployed = await deploy(YearnStrategyDAI, {
    from: deployer,
    log: true,
    args: [poolProxy.address, Address.SWAP_MANAGER],
  })
  await execute(YearnStrategyDAI, {from: deployer, log: true}, 'init', Address.ADDRESS_LIST_FACTORY)
  await execute(YearnStrategyDAI, {from: deployer, log: true}, 'approveToken')
  await execute(YearnStrategyDAI, {from: deployer, log: true}, 'updateFeeCollector', config.feeCollector)
   // Add strategy in pool accountant
   await execute(
    PoolAccountant,
    {from: deployer, log: true},
    'addStrategy',
    deployed.address,
    config.interestFee,
    config.debtRatio,
    config.debtRate
  )
  deployFunction.id = 'VADAI-YEARN-2'
  return true
}
module.exports = deployFunction
module.exports.tags = ['VADAI-YEARN-2']
