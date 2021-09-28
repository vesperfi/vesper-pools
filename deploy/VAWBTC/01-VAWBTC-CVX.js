'use strict'

const Address = require('../../helper/ethereum/address')
const PoolAccountant = 'PoolAccountant'
const convexSBTCStrategyWBTC = 'ConvexSBTCStrategyWBTC'
const {BigNumber} = require('ethers')
const DECIMAL8 = BigNumber.from('100000000')
const ONE_MILLION = DECIMAL8.mul('1000000')
const config = {
  feeCollector: Address.FEE_COLLECTOR,
  interestFee: '1500',
  debtRatio: '9500',
  debtRate: ONE_MILLION.toString(),
  withdrawFee: 60,
}

const deployFunction = async function ({getNamedAccounts, deployments}) {
  const {deploy, execute} = deployments
  const {deployer} = await getNamedAccounts()
  // Deploy PoolAccountant. This call will deploy ProxyAdmin, proxy and PoolAccountant
  const poolProxy = await deployments.get('VPool')

  const vDaiCrvStrat = await deploy(convexSBTCStrategyWBTC, {
    from: deployer,
    log: true,
    args: [poolProxy.address, Address.SWAP_MANAGER],
  })

  await execute(convexSBTCStrategyWBTC, {from: deployer, log: true}, 'init', Address.ADDRESS_LIST_FACTORY)
  await execute(convexSBTCStrategyWBTC, {from: deployer, log: true}, 'approveToken')
  await execute(convexSBTCStrategyWBTC, {from: deployer, log: true}, 'updateFeeCollector', config.feeCollector)
  await execute(convexSBTCStrategyWBTC, {from: deployer, log: true}, 'addKeeper', Address.KEEPER)

  // Add strategy in pool accountant
  await execute(
    PoolAccountant,
    {from: deployer, log: true},
    'addStrategy',
    vDaiCrvStrat.address,
    config.interestFee,
    config.debtRatio,
    config.debtRate
  )

  deployFunction.id = 'VAWBTC-2'
  return true
}
module.exports = deployFunction
module.exports.tags = ['VAWBTC-2']
