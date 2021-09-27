'use strict'

const VAWBTC = require('../../helper/ethereum/poolConfig').VAWBTC
const Address = require('../../helper/ethereum/address')
const PoolAccountant = 'PoolAccountant'
const crvsBTCStrategyWBTC = 'CrvsBTCStrategyWBTC'
const {BigNumber} = require('ethers')
const DECIMAL6 = BigNumber.from('1000000')
const ONE_MILLION = DECIMAL6.mul('1000000')
const config = {
  feeCollector: Address.FEE_COLLECTOR,
  interestFee: '1500',
  debtRatio: '0',
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
  const poolProxy = await deploy(VAWBTC.contractName, {
    from: deployer,
    log: true,
    args: VAWBTC.poolParams, // Constructor args
    // proxy deployment
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
      viaAdminContract: 'DefaultProxyAdmin',
      execute: {
        init: {
          methodName: 'initialize',
          args: [...VAWBTC.poolParams, accountantProxy.address, Address.ADDRESS_LIST_FACTORY],
        },
      },
    },
  })

  // Initialize PoolAccountant with pool proxy address
  if ((await read(PoolAccountant, {}, 'pool')) === Address.ZERO) {
    await execute(PoolAccountant, {from: deployer, log: true}, 'init', poolProxy.address)
  }

  const vDaiCrvStrat = await deploy(crvsBTCStrategyWBTC, {
    from: deployer,
    log: true,
    args: [poolProxy.address, Address.SWAP_MANAGER],
  })

  await execute(crvsBTCStrategyWBTC, {from: deployer, log: true}, 'init', Address.ADDRESS_LIST_FACTORY)
  await execute(crvsBTCStrategyWBTC, {from: deployer, log: true}, 'approveToken')
  await execute(crvsBTCStrategyWBTC, {from: deployer, log: true}, 'updateFeeCollector', config.feeCollector)
  await execute(crvsBTCStrategyWBTC, {from: deployer, log: true}, 'addKeeper', Address.KEEPER)

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

  await execute(VAWBTC.contractName, {from: deployer, log: true}, 'updateFeeCollector', config.feeCollector)
  await execute(VAWBTC.contractName, {from: deployer, log: true}, 'updateWithdrawFee', config.withdrawFee)

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
          args: [poolProxy.address, [Address.VSP]],
        },
      },
    },
  })

  await execute(VAWBTC.contractName, {from: deployer, log: true}, 'updatePoolRewards', rewardsProxy.address)
  deployFunction.id = 'VAWBTC-1'
  return true
}
module.exports = deployFunction
module.exports.tags = ['VAWBTC-1']
