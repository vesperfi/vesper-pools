'use strict'

const VUNI = require('../helper/ethereum/poolConfig').VUNI
const Address = require('../helper/ethereum/address')

const PoolAccountant = 'PoolAccountant'
const strategyName = 'CompoundStrategyUNI'
const version = 'v3.1'
const {BigNumber} = require('ethers')
const DECIMAL18 = BigNumber.from('1000000000000000000')
const ONE_MILLION = DECIMAL18.mul('1000000')
const config = {
  feeCollector: Address.FEE_COLLECTOR,
  interestFee: '1500',
  debtRatio: '9500',
  debtRate: ONE_MILLION.toString(),
}
let someId
module.exports = async function ({getNamedAccounts, deployments}) {
  const {deploy, execute} = deployments
  const {deployer} = await getNamedAccounts()

  // Deploy PoolAccountant. This call will deploy ProxyAdmin, proxy and PoolAccountant
  const accountantProxy = await deploy(PoolAccountant, {
    from: deployer,
    log: true,
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
    },
  })

  // Deploy Pool. This call will use ProxyAdmin. It will deploy proxy and Pool and also initialize pool
  const poolProxy = await deploy(VUNI.contractName, {
    from: deployer,
    log: true,
    args: VUNI.poolParams, // Constructor args
    // proxy deployment
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
      viaAdminContract: 'DefaultProxyAdmin',
      execute: {
        init: {
          methodName: 'initialize',
          args: [...VUNI.poolParams, accountantProxy.address, Address.ADDRESS_LIST_FACTORY],
        },
      },
    },
    
  })

  // Initialize PoolAccountant with pool proxy address
  await execute(PoolAccountant, {from: deployer, log: true}, 'init', poolProxy.address)

  // Deploy strategy for pool
  const vUNIStrategy = await deploy(strategyName, {
    from: deployer,
    log: true,
    args: [poolProxy.address, Address.SWAP_MANAGER],
  })

  await execute(strategyName, {from: deployer, log: true}, 'init', Address.ADDRESS_LIST_FACTORY)
  await execute(strategyName, {from: deployer, log: true}, 'approveToken')
  await execute(strategyName, {from: deployer, log: true}, 'updateFeeCollector', config.feeCollector)

  // Add strategy in pool accountant
  await execute(
    PoolAccountant,
    {from: deployer, log: true},
    'addStrategy',
    vUNIStrategy.address,
    config.interestFee,
    config.debtRatio,
    config.debtRate
  )
  // TODO: add withdraw fee
  return true
}
module.exports.id = version
