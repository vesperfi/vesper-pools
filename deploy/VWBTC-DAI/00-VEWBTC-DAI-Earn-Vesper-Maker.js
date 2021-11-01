'use strict'

const VEWBTC = require('../../helper/ethereum/poolConfig').VEWBTC_DAI
const Address = require('../../helper/ethereum/address')
const PoolAccountant = 'PoolAccountant'
const EarnStrategy = 'EarnVesperMakerStrategyWBTC'
const {BigNumber} = require('ethers')
const DECIMAL8 = BigNumber.from('100000000')
const ONE_MILLION = DECIMAL8.mul('1000000')
const config = {
  feeCollector: Address.FEE_COLLECTOR,
  interestFee: '2500',
  debtRatio: '9500',
  debtRate: ONE_MILLION.toString(),
  withdrawFee: 0,
}

const deployFunction = async function ({getNamedAccounts, deployments}) {
  const {deploy, execute, read} = deployments
  const {deployer} = await getNamedAccounts()
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
  const poolProxy = await deploy(VEWBTC.contractName, {
    from: deployer,
    log: true,
    args: VEWBTC.poolParams, // Constructor args
    // proxy deployment
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
      viaAdminContract: 'DefaultProxyAdmin',
      execute: {
        init: {
          methodName: 'initialize',
          args: [...VEWBTC.poolParams, accountantProxy.address, Address.ADDRESS_LIST_FACTORY],
        },
      },
    },
  })

  // Initialize PoolAccountant with pool proxy address
  if ((await read(PoolAccountant, {}, 'pool')) === Address.ZERO) {
    await execute(PoolAccountant, {from: deployer, log: true}, 'init', poolProxy.address)
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
          args: [poolProxy.address, [Address.vaDAI, Address.VSP]],
        },
      },
    },
  })

  await execute(VEWBTC.contractName, {from: deployer, log: true}, 'updatePoolRewards', rewardsProxy.address)
  await execute('VesperEarnDrip', {from: deployer, log: true}, 'updateGrowToken', Address.vaDAI)

  const earnStratMaker = await deploy(EarnStrategy, {
    from: deployer,
    log: true,
    args: [poolProxy.address, Address.COLLATERAL_MANAGER, Address.SWAP_MANAGER, Address.vaDAI],
  })

  await execute(EarnStrategy, {from: deployer, log: true}, 'init', Address.ADDRESS_LIST_FACTORY)
  await execute(EarnStrategy, {from: deployer, log: true}, 'approveToken')
  await execute(EarnStrategy, {from: deployer, log: true}, 'createVault')
  await execute(EarnStrategy, {from: deployer, log: true}, 'updateFeeCollector', config.feeCollector)
  await execute(EarnStrategy, {from: deployer, log: true}, 'updateBalancingFactor', 225, 200)
  // Add strategy in pool accountant
  await execute(
    PoolAccountant,
    {from: deployer, log: true},
    'addStrategy',
    earnStratMaker.address,
    config.interestFee,
    config.debtRatio,
    config.debtRate
  )
  deployFunction.id = 'veWBTC-DAI-vaDAI-1'
  return true
}
module.exports = deployFunction
module.exports.tags = ['veWBTC-DAI-vaDAI-1']
