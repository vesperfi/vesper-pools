'use strict'

const VADAI = require('../../helper/ethereum/poolConfig').VADAI
const Address = require('../../helper/ethereum/address')
const vsp = '0x1b40183EFB4Dd766f11bDa7A7c3AD8982e998421'
const PoolAccountant = 'PoolAccountant'
const yearnStratDai = 'YearnStrategyDAI'
const curvStratDai = 'Crv3PoolStrategyDAI'
const {BigNumber} = require('ethers')
const DECIMAL18 = BigNumber.from('1000000000000000000')
const ONE_MILLION = DECIMAL18.mul('1000000')
const config = {
  feeCollector: Address.FEE_COLLECTOR,
  interestFee: '1500',
  debtRatio: '4500',
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
  const poolProxy = await deploy(VADAI.contractName, {
    from: deployer,
    log: true,
    args: VADAI.poolParams, // Constructor args
    // proxy deployment
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
      viaAdminContract: 'DefaultProxyAdmin',
      execute: {
        init: {
          methodName: 'initialize',
          args: [...VADAI.poolParams, accountantProxy.address, Address.ADDRESS_LIST_FACTORY],
        },
      },
    },
  })

  // Initialize PoolAccountant with pool proxy address
  if ((await read(PoolAccountant, {}, 'pool')) === Address.ZERO) {
    await execute(PoolAccountant, {from: deployer, log: true}, 'init', poolProxy.address)
  }

  // Deploy strategy for pool
  const vDaiYearnStrat = await deploy(yearnStratDai, {
    from: deployer,
    log: true,
    args: [poolProxy.address, Address.SWAP_MANAGER],
  })

  await execute(yearnStratDai, {from: deployer, log: true}, 'init', Address.ADDRESS_LIST_FACTORY)
  await execute(yearnStratDai, {from: deployer, log: true}, 'approveToken')
  await execute(yearnStratDai, {from: deployer, log: true}, 'updateFeeCollector', config.feeCollector)

  // Add strategy in pool accountant
  await execute(
    PoolAccountant,
    {from: deployer, log: true},
    'addStrategy',
    vDaiYearnStrat.address,
    config.interestFee,
    config.debtRatio,
    config.debtRate
  )

  await execute(VADAI.contractName, {from: deployer, log: true}, 'updateFeeCollector', config.feeCollector)
  await execute(VADAI.contractName, {from: deployer, log: true}, 'updateWithdrawFee', config.withdrawFee)

  const vDaiCrvStrat = await deploy(curvStratDai, {
    from: deployer,
    log: true,
    args: [poolProxy.address, Address.SWAP_MANAGER],
  })

  await execute(curvStratDai, {from: deployer, log: true}, 'init', Address.ADDRESS_LIST_FACTORY)
  await execute(curvStratDai, {from: deployer, log: true}, 'approveToken')
  await execute(curvStratDai, {from: deployer, log: true}, 'updateFeeCollector', config.feeCollector)

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

  await execute(VADAI.contractName, {from: deployer, log: true}, 'updateFeeCollector', config.feeCollector)
  await execute(VADAI.contractName, {from: deployer, log: true}, 'updateWithdrawFee', config.withdrawFee)

  const rewardsProxy = await deploy('PoolRewards', {
    from: deployer,
    log: true,
    // proxy deployment
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
      viaAdminContract: 'DefaultProxyAdmin',
      execute: {
        init: {
          methodName: 'initialize',
          args: [poolProxy.address, vsp],
        },
      },
    },
  })

  await execute(VADAI.contractName, {from: deployer, log: true}, 'updatePoolRewards', rewardsProxy.address)

  // Prepare id of deployment, next deployment will be triggered if id is changed
  const poolVersion = await read(VADAI.contractName, {}, 'VERSION')
  const poolAccountantVersion = await read(PoolAccountant, {}, 'VERSION')
  deployFunction.id = `${VADAI.poolParams[1]}-v${poolVersion}_${poolAccountantVersion}`
  return true
}
module.exports = deployFunction
module.exports.tags = ['VADAI']
