'use strict'

const { ethers } = require('hardhat')
const { isDelegateOrOwner, proposeTxn } = require('./gnosis-txn')

const PoolAccountant = 'PoolAccountant'
const VPoolUpgrader = 'VPoolUpgrader'
const DefaultProxyAdmin = 'DefaultProxyAdmin'
const ADMIN_SLOT = '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103'

async function getProxyAdminAddress(proxyAddress) {
  const proxyAdminStorage = (await ethers.provider.getStorageAt(proxyAddress, ADMIN_SLOT)).toString()
  return `0x${proxyAdminStorage.slice(26)}`
}

async function deployUpgraderIfNeeded(hre, upgraderName, deployer, proxy) {
  const { deployments, targetChain } = hre
  const { deploy, execute, read } = deployments
  const address = require(`../helper/${targetChain}/address`)

  // Deploy upgrader. Hardhat-deploy will reuse contract if already exist
  const MULTICALL = address.MULTICALL
  const upgrader = await deploy(upgraderName, {
    from: deployer,
    log: true,
    args: [MULTICALL],
  })

  const proxyAdmin = await read(upgraderName, 'getProxyAdmin', proxy.address).catch(() => null)
  if (!proxyAdmin) {
    // Fail fast. It will fail if no deployment exist or DefaultProxyAdmin is not proxyAdmin of proxy
    await read(DefaultProxyAdmin, 'getProxyAdmin', proxy.address).catch(function (error) {
      throw new Error(`Either no artifact found or not the proxyAdmin, ${error}`)
    })

    console.log('DefaultProxyAdmin exist and it is admin of proxy.')
    // Check ownership of defaultProxyAdmin
    if ((await read(DefaultProxyAdmin, 'owner')) !== deployer) {
      throw new Error('Deployer is not owner of DefaultProxyAdmin. Cant upgrade pool')
    }

    // DefaultProxyAdmin is admin of proxy. Change proxyAdmin to safe upgrader
    console.log(`Changing proxyAdmin to ${upgraderName}`)
    await execute(DefaultProxyAdmin, { from: deployer, log: true }, 'changeProxyAdmin', proxy.address, upgrader.address)
  }
}

/* eslint-disable complexity */
async function safeUpgrade(hre, deployer, contract, params = []) {
  const { deployments, targetChain } = hre
  const { deploy, execute, read } = deployments
  let upgraderName = `${contract}Upgrader`
  if (contract === 'VETH') {
    upgraderName = VPoolUpgrader
  }
  const Address = require(`../helper/${targetChain}/address`)
  const safe = Address.MultiSig.safe
  const proxy = await deployments.get(contract)

  // Deployment may not exist so keep using ethers.getContractAt. DO NOT use read()
  const upgrader = await ethers.getContractAt(upgraderName, await getProxyAdminAddress(proxy.address))
  const upgraderOwner = await upgrader.owner()

  const canPropose = isDelegateOrOwner(safe, deployer, targetChain)

  // Safe is owner of upgrader but deployer is neither owner nor delegate. Fail fast
  if (safe === upgraderOwner && !canPropose) {
    throw new Error('Deployer is neither owner nor delegate of Gnosis safe', safe)
  }

  // This is temporary process until we use upgrader everywhere
  if (deployer === upgraderOwner) {
    await deployUpgraderIfNeeded(hre, upgraderName, deployer, proxy)
  }

  console.log(`\nInitiating safeUpgrade of ${contract}`)

  let deployedImpl
  if (Object.keys(hre.contractsToReuse).includes(contract)) {
    deployedImpl = hre.contractsToReuse[contract]
    console.log(`reusing "${contract}" at ${deployedImpl.address}`)
  } else {
    deployedImpl = await deploy(`${contract}_Implementation`, {
      contract,
      from: deployer,
      log: true,
      args: params,
    })
    // Add implementation address in hre
    hre.implementations[contract] = deployedImpl.address
  }

  if (deployer === upgraderOwner) {
    console.log(`Deployer is owner of upgrader. Safe upgrading ${contract} via ${upgraderName}`)
    await execute(upgraderName, { from: deployer, log: true }, 'safeUpgrade', proxy.address, deployedImpl.address)
  } else if (safe === upgraderOwner) {
    console.log(`MultiSig is owner of upgrader. Proposing safeUpgrade of ${contract} via ${upgraderName}`)
    const contractData = {
      contract: upgraderName,
      address: upgrader.address,
      method: { name: 'safeUpgrade', args: [proxy.address, deployedImpl.address] },
    }
    await proposeTxn(targetChain, deployer, hre.multiSigNonce, contractData)
    hre.multiSigNonce += 1
  } else {
    throw new Error('Deployer is neither owner nor a delegate')
  }

  // This is temporary and for V5 upgrade only
  if (upgraderName === VPoolUpgrader) {
    // If universal fee is zero then call setup
    const universalFee = await read(contract, {}, 'universalFee')
    if (universalFee.toString() === '0') {
      const governor = await read(contract, {}, 'governor')
      if (governor === deployer) {
        await execute(contract, { from: deployer, log: true }, 'setup')
      } else if (governor === safe && canPropose) {
        const contractData = {
          contract,
          address: proxy.address,
          method: { name: 'setup', args: [] },
        }
        await proposeTxn(targetChain, deployer, hre.multiSigNonce, contractData)
        hre.multiSigNonce += 1
      } else {
        throw new Error('Setup could not be executed')
      }
    }
  }
}

const deployFunction = async function (hre) {
  const { getNamedAccounts, poolConfig } = hre
  const { deployer } = await getNamedAccounts()
  // This info will be used later in deploy-pool task
  hre.implementations = {}

  // TODO Consider calling both atomically
  await safeUpgrade(hre, deployer, poolConfig.contractName, poolConfig.poolParams)
  await safeUpgrade(hre, deployer, PoolAccountant)

  deployFunction.id = 'upgrade-pool'
  return true
}
module.exports = deployFunction
module.exports.tags = ['upgrade-pool']
