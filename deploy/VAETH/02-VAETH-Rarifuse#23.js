'use strict'

const Address = require('../../helper/ethereum/address')
const RariFuseStrategy = 'RariFuseStrategyETH'
const PoolAccountant = 'PoolAccountant'
const {BigNumber} = require('ethers')
const DECIMAL18 = BigNumber.from('1000000000000000000')
const ONE_MILLION = DECIMAL18.mul('1000000')
const RARI_FUSE_POOL_ID = 23
const KEEPER = '0x76d266dfd3754f090488ae12f6bd115cd7e77ebd'
const config = {
  feeCollector: Address.FEE_COLLECTOR,
  interestFee: '1500',
  debtRatio: '1000',
  debtRate: ONE_MILLION.toString(),
  withdrawFee: 60,
}
const deployFunction = async function ({getNamedAccounts, deployments}) {
  const {deploy, execute} = deployments
  const {deployer} = await getNamedAccounts()

  const poolProxy = await deployments.get('VETH')
  const deployed = await deploy(RariFuseStrategy, {
    from: deployer,
    log: true,
    args: [poolProxy.address, Address.SWAP_MANAGER, RARI_FUSE_POOL_ID],
  })
  await execute(RariFuseStrategy, {from: deployer, log: true}, 'init', Address.ADDRESS_LIST_FACTORY)
  await execute(RariFuseStrategy, {from: deployer, log: true}, 'approveToken')
  await execute(RariFuseStrategy, {from: deployer, log: true}, 'updateFeeCollector', config.feeCollector)
  await execute(RariFuseStrategy, {from: deployer, log: true}, 'addKeeper', KEEPER)
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
  deployFunction.id = 'VAETH-RARI-1'
  return true
}
module.exports = deployFunction
module.exports.tags = ['VAETH-RARI-1']
