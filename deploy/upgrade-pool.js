'use strict'

const { OperationType } = require('ethers-multisend')
const { ethers } = require('hardhat')
const { isDelegateOrOwner, proposeTxn, proposeMultiTxn } = require('./gnosis-txn')

const PoolAccountant = 'PoolAccountant'
const VPoolUpgrader = 'VPoolUpgrader'
const DefaultProxyAdmin = 'DefaultProxyAdmin'
const ADMIN_SLOT = '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103'

async function prepareTxn(contractName, address, method, methodArgs) {
  const contract = await ethers.getContractAt(contractName, address)
  const encodedTxn = await contract.populateTransaction[method](...methodArgs)
  return {
    operation: OperationType.Call,
    to: address,
    value: 0,
    data: encodedTxn.data,
  }
}

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
  const { deploy, execute } = deployments
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

  const txnsToPropose = []
  if (deployer === upgraderOwner) {
    console.log(`Deployer is owner of upgrader. Safe upgrading ${contract} via ${upgraderName}`)
    await execute(upgraderName, { from: deployer, log: true }, 'safeUpgrade', proxy.address, deployedImpl.address)
  } else if (safe === upgraderOwner) {
    console.log(`MultiSig is owner of upgrader. Preparing safeUpgrade of ${contract} via ${upgraderName}`)
    const txn = await prepareTxn(upgraderName, upgrader.address, 'safeUpgrade', [proxy.address, deployedImpl.address])
    txnsToPropose.push(txn)
  } else {
    throw new Error('Deployer is neither owner nor a delegate')
  }

  // This is temporary and for V5 upgrade only
  if (upgraderName === VPoolUpgrader) {
    // If universal fee is zero then call setup
    const vPool = await ethers.getContractAt(contract, proxy.address)
    const universalFee = await vPool.universalFee().catch(() => 0)
    if (universalFee.toString() === '0') {
      const governor = await vPool.governor()
      if (governor === safe && canPropose) {
        txnsToPropose.push(await prepareTxn(contract, proxy.address, 'setup', []))
      } else {
        console.log('\nSafe is not governor of pool, setup needs to be call manually\n')
      }
    }
  }
  return txnsToPropose
}

const deployFunction = async function (hre) {
  const { getNamedAccounts, poolConfig, targetChain, multisigNonce } = hre
  const { deployer } = await getNamedAccounts()
  // This info will be used later in deploy-pool task
  hre.implementations = {}

  const txnsToPropose = []
  const poolTxns = await safeUpgrade(hre, deployer, poolConfig.contractName, poolConfig.poolParams)
  const accountantTxns = await safeUpgrade(hre, deployer, PoolAccountant)
  txnsToPropose.push(...poolTxns)
  txnsToPropose.push(...accountantTxns)

  if (txnsToPropose.length === 1) {
    await proposeTxn(targetChain, deployer, multisigNonce, ...txnsToPropose)
  } else if (txnsToPropose.length > 1) {
    await proposeMultiTxn(targetChain, deployer, multisigNonce, txnsToPropose)
  }

  deployFunction.id = 'upgrade-pool'
  return true
}
module.exports = deployFunction
module.exports.tags = ['upgrade-pool']
