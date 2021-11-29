'use strict'

const VEDAI = require('../../helper/mainnet/poolConfig').VEDAI_ETH
const Address = require('../../helper/mainnet/address')
const PoolAccountant = 'PoolAccountant'
const EarnStrategy = 'EarnVesperStrategyDAIWETH'
const { BigNumber } = require('ethers')
const DECIMAL8 = BigNumber.from('100000000')
const ONE_MILLION = DECIMAL8.mul('1000000')
const config = {
  feeCollector: Address.FEE_COLLECTOR,
  interestFee: '2500',
  debtRatio: '9500',
  debtRate: ONE_MILLION.toString(),
  withdrawFee: 0,
}

const deployFunction = async function ({ getNamedAccounts, deployments }) {
  const { deploy, execute, read } = deployments
  const { deployer } = await getNamedAccounts()
  console.log('deployer', deployer)
  // Deploy PoolAccountant. This call will deploy ProxyAdmin, proxy and PoolAccountant
  const accountantProxy = await deploy(PoolAccountant, {
    from: deployer,
    log: true,
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
    },
  })

  // Deploy Pool. This call will use ProxyAdmin. It will deploy proxy and Pool and also initialize pool
  const poolProxy = await deploy(VEDAI.contractName, {
    from: deployer,
    log: true,
    args: VEDAI.poolParams, // Constructor args
    // proxy deployment
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
      viaAdminContract: 'DefaultProxyAdmin',
      execute: {
        init: {
          methodName: 'initialize',
          args: [...VEDAI.poolParams, accountantProxy.address, Address.ADDRESS_LIST_FACTORY],
        },
      },
    },
  })

  // Initialize PoolAccountant with pool proxy address
  if ((await read(PoolAccountant, {}, 'pool')) === Address.ZERO) {
    await execute(PoolAccountant, { from: deployer, log: true }, 'init', poolProxy.address)
  }

  const rewardsProxy = await deploy('VesperEarnDrip', {
    from: deployer,
    log: true,
    // proxy deployment
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
      viaAdminContract: 'DefaultProxyAdmin',
      execute: {
        init: {
          methodName: 'initialize',
          args: [poolProxy.address, [Address.vaETH, Address.VSP]],
        },
      },
    },
  })

  await execute(VEDAI.contractName, { from: deployer, log: true }, 'updatePoolRewards', rewardsProxy.address)
  await execute('VesperEarnDrip', { from: deployer, log: true }, 'updateGrowToken', Address.vaETH)

  const earnStrat = await deploy(EarnStrategy, {
    from: deployer,
    log: true,
    args: [poolProxy.address, Address.SWAP_MANAGER],
  })

  await execute(EarnStrategy, { from: deployer, log: true }, 'init', Address.ADDRESS_LIST_FACTORY)
  await execute(EarnStrategy, { from: deployer, log: true }, 'approveToken')
  await execute(EarnStrategy, { from: deployer, log: true }, 'updateFeeCollector', config.feeCollector)
  // Add strategy in pool accountant
  await execute(
    PoolAccountant,
    { from: deployer, log: true },
    'addStrategy',
    earnStrat.address,
    config.interestFee,
    config.debtRatio,
    config.debtRate,
  )
  deployFunction.id = 'veDAI-ETH-vaDAI-1'
  return true
}
module.exports = deployFunction
module.exports.tags = ['veDAI-ETH-vaDAI-1']
