'use strict'

const VDAI = require('../../helper/ethereum/poolConfig').VDAI
const Address = require('../../helper/ethereum/address')
const vsp = '0x1b40183EFB4Dd766f11bDa7A7c3AD8982e998421'
const PoolAccountant = 'PoolAccountant'
const strategyName = 'CompoundStrategyDAI'

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
  const poolProxy = await deploy(VDAI.contractName, {
    from: deployer,
    log: true,
    args: VDAI.poolParams, // Constructor args
    // proxy deployment
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
      viaAdminContract: 'DefaultProxyAdmin',
      execute: {
        init: {
          methodName: 'initialize',
          args: [...VDAI.poolParams, accountantProxy.address, Address.ADDRESS_LIST_FACTORY],
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
  await execute(strategyName, {from: deployer, log: true}, 'approveToken')
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
  await execute(VDAI.contractName, {from: deployer, log: true}, 'updateFeeCollector', config.feeCollector)
  await execute(VDAI.contractName, {from: deployer, log: true}, 'updateWithdrawFee', config.withdrawFee)

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

  await execute(VDAI.contractName, {from: deployer, log: true}, 'updatePoolRewards', rewardsProxy.address)
  deployFunction.id = 'VDAI-Compound-1'
  return true
}
module.exports = deployFunction
module.exports.tags = ['VDAI-Compound-1']
