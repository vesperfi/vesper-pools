'use strict'

const Address = require('../../helper/ethereum/address')
const VesperMakerStrategy = 'VesperMakerStrategyWBTC'
const PoolAccountant = 'PoolAccountant'
const {BigNumber} = require('ethers')
const DECIMAL8 = BigNumber.from('100000000')
const ONE_MILLION = DECIMAL8.mul('1000000')
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
  const deployed = await deploy(VesperMakerStrategy, {
    from: deployer,
    log: true,
    args: [poolProxy.address, Address.COLLATERAL_MANAGER,Address.SWAP_MANAGER, Address.vaDAI],
  })
  await execute(VesperMakerStrategy, {from: deployer, log: true}, 'init', Address.ADDRESS_LIST_FACTORY)
  await execute(VesperMakerStrategy, {from: deployer, log: true}, 'approveToken')
  await execute(VesperMakerStrategy, {from: deployer, log: true}, 'createVault')
  await execute(VesperMakerStrategy, {from: deployer, log: true}, 'updateFeeCollector', config.feeCollector)
  await execute(VesperMakerStrategy, {from: deployer, log: true}, 'updateBalancingFactor', 225, 200)
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
  deployFunction.id = 'VAWBTC-Vesper-Maker'
  return true
}
module.exports = deployFunction
module.exports.tags = ['VAWBTC-Vesper-Maker']
