'use strict'

const VUSDC = require('../helper/ethereum/poolConfig').VUSDC
const Address = require('../helper/ethereum/address')

const PoolAccountant = 'PoolAccountant'
const strategyName = 'AaveStrategyUSDC'
const version = 'v3.0'
const {BigNumber} = require('ethers')
const DECIMAL18 = BigNumber.from('1000000000000000000')
const ONE_MILLION = DECIMAL18.mul('1000000')
const config = {
  feeCollector: '0x223809E09ec28C28219769C3FF05c790c213152C',
  interestFee: '1500',
  debtRatio: '9000',
  debtRate: ONE_MILLION.toString(),
}

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
  const poolProxy = await deploy(VUSDC.contractName, {
    from: deployer,
    log: true,
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
      viaAdminContract: 'DefaultProxyAdmin',
      execute: {
        init: {
          methodName: 'initialize',
          args: [...VUSDC.poolParams, accountantProxy.address, Address.ADDRESS_LIST_FACTORY],
        },
      },
    },
    args: VUSDC.poolParams,
  })

  // Initialize PoolAccountant with pool proxy address
  await execute(PoolAccountant, {from: deployer, log: true}, 'init', poolProxy.address)

  // Deploy strategy for pool
  const swapManager = '0xC48ea9A2daA4d816e4c9333D6689C70070010174'
  const vUSDCStrategy = await deploy(strategyName, {
    from: deployer,
    log: true,
    args: [poolProxy.address, swapManager],
  })

  await execute(strategyName, {from: deployer, log: true}, 'init', Address.ADDRESS_LIST_FACTORY)
  await execute(strategyName, {from: deployer, log: true}, 'approveToken')
  await execute(strategyName, {from: deployer, log: true}, 'updateFeeCollector', config.feeCollector)

  // Add strategy in pool accountant
  await execute(
    PoolAccountant,
    {from: deployer, log: true},
    'addStrategy',
    vUSDCStrategy.address,
    config.interestFee,
    config.debtRatio,
    config.debtRate
  )
  // TODO: add withdraw fee
}
module.exports.tags = [`${VUSDC.poolParams[1]}-${version}`, `${strategyName}-${version}`]
