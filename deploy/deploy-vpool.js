'use strict'

const { ethers } = require('hardhat')
const PoolAccountant = 'PoolAccountant'
const PoolAccountantUpgrader = 'PoolAccountantUpgrader'
const VPoolUpgrader = 'VPoolUpgrader'
const PoolRewardsUpgrader = 'PoolRewardsUpgrader'

// eslint-disable-next-line consistent-return
function sleep(network, ms) {
  if (network !== 'localhost') {
    console.log(`waiting for ${ms} ms`)
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

const deployFunction = async function (hre) {
  const { getNamedAccounts, deployments, poolConfig, targetChain } = hre
  const { deploy, execute, read } = deployments
  const { deployer } = await getNamedAccounts()
  const networkName = hre.network.name
  const Address = require(`../helper/${targetChain}/address`)
  // Wait for 2 blocks in network is not localhost
  const waitConfirmations = networkName === 'localhost' ? 0 : 2
  // This info will be used later in deploy-pool task
  hre.implementations = {}

  // Deploy upgrader
  await deploy(PoolAccountantUpgrader, { from: deployer, log: true, args: [Address.MultiCall], waitConfirmations })

  // Deploy PoolAccountant. This call will deploy ProxyAdmin, proxy and PoolAccountant
  const accountantProxy = await deploy(PoolAccountant, {
    from: deployer,
    log: true,
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
      viaAdminContract: PoolAccountantUpgrader,
    },
    waitConfirmations,
  })

  // Add implementation address in hre
  hre.implementations[PoolAccountant] = accountantProxy.implementation

  await sleep(networkName, 5000)

  // Deploy upgrader
  await deploy(VPoolUpgrader, { from: deployer, log: true, args: [Address.MultiCall], waitConfirmations })

  // Deploy Pool. This call will use ProxyAdmin. It will deploy proxy and Pool and also initialize pool
  const poolProxy = await deploy(poolConfig.contractName, {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
    args: ['Vesper pool', 'vPool', Address.ZERO], // hardcoded impl constructor argument
    // proxy deployment
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
      viaAdminContract: VPoolUpgrader,
      execute: {
        init: {
          methodName: 'initialize',
          args: [...poolConfig.poolParams, accountantProxy.address],
        },
      },
    },
    waitConfirmations,
  })

  // Add implementation address in hre
  hre.implementations[poolConfig.contractName] = poolProxy.implementation

  // Initialize PoolAccountant with pool proxy address
  if ((await read(PoolAccountant, {}, 'pool')) === ethers.constants.AddressZero) {
    await sleep(networkName, 5000)
    await execute(PoolAccountant, { from: deployer, log: true }, 'init', poolProxy.address)
  }

  // If universal fee is zero then call setup
  const universalFee = await read(poolConfig.contractName, {}, 'universalFee')
  if (universalFee.toString() === '0') {
    await sleep(networkName, 5000)
    await execute(poolConfig.contractName, { from: deployer, log: true }, 'setup')
  }

  // Prepare id of deployment, next deployment will be triggered if id is changed
  const poolVersion = await read(poolConfig.contractName, {}, 'VERSION')
  const poolAccountantVersion = await read(PoolAccountant, {}, 'VERSION')
  deployFunction.id = `${poolConfig.poolParams[1]}-v${poolVersion}_${poolAccountantVersion}`

  if (poolConfig.rewards.tokens.length === 0) {
    return true
  }
  const rewards = poolConfig.rewards
  // Deploy pool rewards (Vesper Earn drip for Earn pools)
  await sleep(networkName, 5000)

  // Deploy upgrader
  await deploy(PoolRewardsUpgrader, { from: deployer, log: true, args: [Address.MultiCall], waitConfirmations })
  const rewardsProxy = await deploy(rewards.contract, {
    from: deployer,
    log: true,
    // proxy deployment
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
      viaAdminContract: PoolRewardsUpgrader,
      execute: {
        init: {
          methodName: 'initialize',
          args: [poolProxy.address, rewards.tokens],
        },
      },
    },
    waitConfirmations,
  })

  // Add implementation address in hre
  hre.implementations[rewards.contract] = rewardsProxy.implementation

  // Update pool rewards in pool
  if ((await read(poolConfig.contractName, {}, 'poolRewards')) === ethers.constants.AddressZero) {
    await sleep(networkName, 5000)
    await execute(poolConfig.contractName, { from: deployer, log: true }, 'updatePoolRewards', rewardsProxy.address)
  }

  // Update grow token in Vesper Earn Drip contract of Earn pool
  if (
    poolConfig.poolParams[0].includes('Earn') &&
    'growToken' in rewards &&
    (await read(rewards.contract, {}, 'growToken')) === ethers.constants.AddressZero
  ) {
    await sleep(networkName, 5000)
    await execute(rewards.contract, { from: deployer, log: true }, 'updateGrowToken', rewards.growToken)
  }

  return true
}
module.exports = deployFunction
module.exports.tags = ['deploy-vPool']
