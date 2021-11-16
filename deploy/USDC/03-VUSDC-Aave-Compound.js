'use strict'

const { ethers } = require('hardhat')
const VUSDC = require('../../helper/mainnet/poolConfig').VUSDC
const Address = require('../../helper/mainnet/address')

const PoolAccountant = 'PoolAccountant'
const aaveStrategyUSDC = 'AaveStrategyUSDC'
const compoundStrategyUSDC = 'CompoundStrategyUSDC'

const ONE_MILLION = ethers.utils.parseUnits('1000000', 6)
const config = {
  feeCollector: Address.FEE_COLLECTOR,
  interestFee: '1500',
  debtRatio: '4500',
  debtRate: ONE_MILLION.toString(),
  withdrawFee: 60,
}

const deployFunction = async function ({ getNamedAccounts, deployments }) {
  const { deploy, execute, read } = deployments
  const { deployer } = await getNamedAccounts()

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
    await execute(PoolAccountant, { from: deployer, log: true }, 'init', poolProxy.address)
  }

  // Update pool fee collector and withdraw fee
  await execute(VUSDC.contractName, { from: deployer, log: true }, 'updateFeeCollector', config.feeCollector)
  await execute(VUSDC.contractName, { from: deployer, log: true }, 'updateWithdrawFee', config.withdrawFee)

  // @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ Deploy aaveStrategyUSDC @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ //
  const aaveStrategy = await deploy(aaveStrategyUSDC, {
    from: deployer,
    log: true,
    args: [poolProxy.address, Address.SWAP_MANAGER],
  })

  await execute(aaveStrategyUSDC, { from: deployer, log: true }, 'init', Address.ADDRESS_LIST_FACTORY)
  await execute(aaveStrategyUSDC, { from: deployer, log: true }, 'approveToken')
  await execute(aaveStrategyUSDC, { from: deployer, log: true }, 'updateFeeCollector', config.feeCollector)

  // Add strategy in pool accountant
  await execute(
    PoolAccountant,
    { from: deployer, log: true },
    'addStrategy',
    aaveStrategy.address,
    config.interestFee,
    config.debtRatio,
    config.debtRate,
  )

  // @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ Deploy compoundStrategyUSDC @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ //
  const compoundStrategy = await deploy(compoundStrategyUSDC, {
    from: deployer,
    log: true,
    args: [poolProxy.address, Address.SWAP_MANAGER],
  })

  await execute(compoundStrategyUSDC, { from: deployer, log: true }, 'init', Address.ADDRESS_LIST_FACTORY)
  await execute(compoundStrategyUSDC, { from: deployer, log: true }, 'approveToken')
  await execute(compoundStrategyUSDC, { from: deployer, log: true }, 'updateFeeCollector', config.feeCollector)

  // Add strategy in pool accountant
  await execute(
    PoolAccountant,
    { from: deployer, log: true },
    'addStrategy',
    compoundStrategy.address,
    config.interestFee,
    config.debtRatio,
    config.debtRate,
  )

  deployFunction.id = 'VUSDC-Aave-Compound'
  return true
}
module.exports = deployFunction
module.exports.tags = ['VUSDC-Aave-Compound']
