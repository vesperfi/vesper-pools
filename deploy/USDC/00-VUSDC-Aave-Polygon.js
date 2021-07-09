'use strict'

const VUSDC = require('../../helper/polygon/poolConfig').VUSDC
const Address = require('../../helper/polygon/address')

const PoolAccountant = 'PoolAccountant'
const strategyName = 'AaveStrategyPolygonUSDC'

const {BigNumber} = require('ethers')
const DECIMAL6 = BigNumber.from('1000000')
const ONE_MILLION = DECIMAL6.mul('1000000')
const config = {
  feeCollector: Address.FEE_COLLECTOR,
  interestFee: '1500',
  debtRatio: '9500',
  debtRate: ONE_MILLION.toString(),
  withdrawFee: 60,
}

const deployFunction = async function ({getNamedAccounts, deployments}) {
  const {deploy, execute, read} = deployments
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
    args: VUSDC.poolParams, // Constructor args
    // proxy deployment
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
  })

  // Initialize PoolAccountant with pool proxy address
  if ((await read(PoolAccountant, {}, 'pool')) === Address.ZERO) {
    await execute(PoolAccountant, {from: deployer, log: true}, 'init', poolProxy.address)
  }

  // Deploy strategy for pool
  const vUSDTStrategy = await deploy(strategyName, {
    from: deployer,
    log: true,
    args: [poolProxy.address, Address.SWAP_MANAGER],
  })

  await execute(strategyName, {from: deployer, log: true}, 'init', Address.ADDRESS_LIST_FACTORY)
  await execute(strategyName, {from: deployer, log: true, gas: 9000000}, 'approveToken')
  await execute(strategyName, {from: deployer, log: true}, 'updateFeeCollector', config.feeCollector)

  // Add strategy in pool accountant
  await execute(
    PoolAccountant,
    {from: deployer, log: true},
    'addStrategy',
    vUSDTStrategy.address,
    config.interestFee,
    config.debtRatio,
    config.debtRate
  )
  await execute(VUSDC.contractName, {from: deployer, log: true}, 'updateFeeCollector', config.feeCollector)
  await execute(VUSDC.contractName, {from: deployer, log: true}, 'updateWithdrawFee', config.withdrawFee)

  // Prepare id of deployment, next deployment will be triggered if id is changed
  const poolVersion = await read(VUSDC.contractName, {}, 'VERSION')
  const poolAccountantVersion = await read(PoolAccountant, {}, 'VERSION')
  deployFunction.id = `${VUSDC.poolParams[1]}-v${poolVersion}_${poolAccountantVersion}`
  return true
}
module.exports = deployFunction
module.exports.tags = ['VUSDC-P-v3.0.4']
