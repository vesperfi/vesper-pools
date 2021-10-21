'use strict'

const Address = require('../../helper/ethereum/address')
const PoolAccountant = 'PoolAccountant'
const EarnCompoundStrategyETH = 'EarnCompoundStrategyETH'
const {BigNumber} = require('ethers')
const DECIMAL18 = BigNumber.from('1000000000000000000')
const ONE_MILLION = DECIMAL18.mul('1000000')
const config = {
  feeCollector: Address.FEE_COLLECTOR,
  interestFee: '1500',
  debtRatio: '500',
  debtRate: ONE_MILLION.toString(),
  withdrawFee: 60,
}
const deployFunction = async function ({getNamedAccounts, deployments}) {
  const {deploy, execute} = deployments
  const {deployer} = await getNamedAccounts()

  const poolProxy = await deployments.get('VETH')
  // Deploy strategy for pool
  const deployed = await deploy(EarnCompoundStrategyETH, {
    from: deployer,
    log: true,
    args: [poolProxy.address, Address.SWAP_MANAGER],
  })

  await execute(EarnCompoundStrategyETH, {from: deployer, log: true}, 'init', Address.ADDRESS_LIST_FACTORY)
  await execute(EarnCompoundStrategyETH, {from: deployer, log: true}, 'approveToken')
  await execute(EarnCompoundStrategyETH, {from: deployer, log: true}, 'updateFeeCollector', config.feeCollector)
  await execute(EarnCompoundStrategyETH, {from: deployer, log: true}, 'addKeeper', Address.KEEPER)
  
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
  deployFunction.id = 'veETH-DAI-COMP-2'
  return true
}
module.exports = deployFunction
module.exports.tags = ['veETH-DAI-COMP-2']
