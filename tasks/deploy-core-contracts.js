'use strict'

const _ = require('lodash')
const del = require('del')
const copy = require('recursive-copy')
const fs = require('fs')
const execSync = require('child_process').execSync

const PoolAccountant = 'PoolAccountant'
const PoolRewards = 'PoolRewards'
const VesperEarnDrip = 'VesperEarnDrip'
const poolBaseDir = 'contracts/pool'

// Validate given keys exists in given object
function validateObject(object, keys) {
  keys.forEach(function (key) {
    if (!_.has(object, key)) {
      throw new Error(`${key} is missing in pool config`)
    }
  })
}

function validatePoolConfig(poolConfig, targetChain) {
  // Fail fast
  if (!poolConfig) {
    throw new Error(`Missing "${hre.poolName}" configuration in /helper/${targetChain}/poolConfig file`)
  }
  const topLevelKeys = ['contractName', 'poolParams', 'rewards', 'setup']
  // Validate top level properties in config object
  validateObject(poolConfig, topLevelKeys)

  // Validate pool params
  if (poolConfig.poolParams.length !== 3) {
    throw new Error('Incorrect pool params. Pool name, symbol and token are required')
  }

  // Validate setup in config object
  const setupKeys = ['universalFee']
  validateObject(poolConfig.setup, setupKeys)

  // Validate rewards in config object
  let rewardsKeys = ['contract', 'tokens']
  if (poolConfig.poolParams[0].includes('Earn')) {
    rewardsKeys = ['contract', 'tokens']
    validateObject(poolConfig.rewards, rewardsKeys)
    if (poolConfig.rewards.contract !== VesperEarnDrip) {
      throw new Error('Wrong contract name for Earn Rewards pool')
    }
  } else {
    validateObject(poolConfig.rewards, rewardsKeys)
    if (poolConfig.rewards.contract !== PoolRewards) {
      throw new Error('Wrong contract name for Rewards Pool')
    }
    if (!poolConfig.rewards.tokens.length) {
      console.log('Deploying without any rewards tokens')
    }
  }
}

function getProxyContracts() {
  const proxyContracts = [
    { contract: hre.poolConfig.contractName, path: poolBaseDir },
    { contract: PoolAccountant, path: poolBaseDir },
    { contract: PoolRewards, path: poolBaseDir },
  ]
  if (hre.poolConfig.poolParams[0].includes('Earn')) {
    proxyContracts[2] = { contract: VesperEarnDrip, path: `${poolBaseDir}/earn/` }
  }
  return proxyContracts
}

async function shouldReuseImplementation(network, versionInfo, config) {
  if (!versionInfo || !versionInfo[config.contract]) {
    console.debug(`Version info of ${config.contract} on ${network} is missing, will deploy new implementation`)
    return false
  }
  const oldVersion = versionInfo[config.contract].version
  const command = `cat ${config.path}/${config.contract}.sol | grep 'VERSION' | awk '{ print $6 }'`
  const newVersion = execSync(command).toString().slice(1, 6)
  console.debug(`${config.contract}:: old version is ${oldVersion}`)
  console.debug(`${config.contract}:: new versions is ${newVersion}`)

  // We will reuse already deployed implementation if versions are same.
  return newVersion === oldVersion
}

async function getContractsToReuse() {
  const networkName = hre.network.name
  const versionInfoFile = `./deployments/${networkName}/.versionInfo.json`
  let versionInfo
  if (fs.existsSync(versionInfoFile)) {
    versionInfo = JSON.parse(fs.readFileSync(versionInfoFile))
  }

  const contractsToReuse = []
  const proxyContracts = getProxyContracts()

  for (const proxy of proxyContracts) {
    const shouldReuse = await shouldReuseImplementation(networkName, versionInfo, proxy)
    if (shouldReuse) {
      contractsToReuse[proxy.contract] = versionInfo[proxy.contract]
    }
  }

  console.debug('Contracts to reuse', contractsToReuse)
  return contractsToReuse
}

async function updateVersionInfo(reusedContracts, deployedContractInfo = {}) {
  // Update version info
  const versionInfoFile = `./deployments/${hre.network.name}/.versionInfo.json`
  let versionInfo
  if (fs.existsSync(versionInfoFile)) {
    versionInfo = JSON.parse(fs.readFileSync(versionInfoFile))
  }
  // Get name of deployed contracts
  const contractNames = Object.keys(deployedContractInfo).filter(name => !reusedContracts.includes(name))
  // Prepare version info for each deployed contract
  for (const contractName of contractNames) {
    const contract = await ethers.getContractAt(contractName, deployedContractInfo[contractName])
    const value = {
      address: deployedContractInfo[contractName],
      version: await contract.VERSION(),
    }
    if (versionInfo) {
      versionInfo[contractName] = value
    } else {
      versionInfo = {
        [contractName]: value,
      }
    }
  }
  // Store updated version info
  fs.writeFileSync(versionInfoFile, JSON.stringify(versionInfo, null, 2))
}

/* eslint-disable complexity */
async function deployCoreContracts(pool, deployParams, release) {
  let deployer = process.env.DEPLOYER
  // If no deployer than use default
  if (!deployer) {
    deployer = (await ethers.getSigners())[0].address
  }

  if (deployer && deployer.startsWith('ledger')) {
    deployer = deployer.split('ledger://')[1]
  }
  const hreNetwork = hre.network.name
  const targetChain = hre.targetChain
  console.log(
    `Running deploy script on ${hreNetwork} for '${pool} Pool on ${targetChain}' with deployPrams`,
    deployParams,
  )

  const networkDir = `./deployments/${hreNetwork}`
  const poolDir = `${networkDir}/${pool.toLowerCase()}`
  const globalDir = `${networkDir}/global`
  const deployerDir = `${globalDir}/${deployer}`

  try {
    // Copy files from pool directory to network directory for deployment
    if (fs.existsSync(poolDir)) {
      await copy(poolDir, networkDir, { overwrite: true, filter: ['*.json', 'solcInputs/*'] })
    }
    // Copy deployer's default proxy admin and upgrader to network directory for deployment
    if (fs.existsSync(deployerDir)) {
      await copy(deployerDir, networkDir, { overwrite: true, filter: ['*.json'] })
    }

    // Set in hre to later use in upgrade-pool script
    hre.contractsToReuse = await getContractsToReuse()
    const reuseFilter = []
    Object.keys(hre.contractsToReuse).forEach(contract => reuseFilter.push(`${contract}_Implementation.json`))

    // Copy files from global directory to network directory for deployment
    if (fs.existsSync(globalDir)) {
      await copy(globalDir, networkDir, { overwrite: true, filter: ['*.json', '!*Implementation*', ...reuseFilter] })
    }

    // Call deploy script, this is where actual deployment will happen
    await run('deploy', { ...deployParams })
    // Update implementation version info
    await updateVersionInfo(hre.contractsToReuse, hre.implementations)

    let copyFilter = ['*.json', 'solcInputs/*', '!*Implementation.json', '!DefaultProxyAdmin.json', '!*Upgrader.json']

    // Do not copy global deployments into pool specific deployments
    if (fs.existsSync(globalDir)) {
      copyFilter = [...copyFilter, ...fs.readdirSync(globalDir).map(file => `!${file}`)]
    }

    // Copy files from network directory to pool specific directory after deployment
    // Note: This operation will overwrite files. Anything start with dot(.) will not be copied
    await copy(networkDir, poolDir, { overwrite: true, filter: copyFilter })
    // Copy default proxy admin to deployer directory
    await copy(networkDir, deployerDir, { overwrite: true, filter: ['DefaultProxyAdmin.json', '*Upgrader.json'] })
    // Copy deployed implementation to global directory
    await copy(networkDir, globalDir, { overwrite: true, filter: ['CollateralManager.json', '*Implementation.json'] })
  } catch (error) {
    if (error.message.includes('TransportStatusError')) {
      console.error('Error: Ledger device is locked. Please unlock your ledger device!')
      process.exit(1)
    } else {
      console.log(error)
      // In case of failure copy and save data for review
      const filter = ['*.json', 'solcInputs/*']
      await copy(networkDir, `${networkDir}/failed/${pool}`, { overwrite: true, filter })
    }
  } finally {
    // Delete filter to delete all json files and solcInputs directory. Anything start with dot(.) will not be deleted
    const deleteFilter = [`${networkDir}/*.json`, `${networkDir}/solcInputs`]
    // Delete files/directories using deleteFilter from  network directory
    del.sync(deleteFilter)
  }

  if (release) {
    await run('create-release', { pool, release })
  }
}

/* eslint-disable no-param-reassign */
task('deploy-core-contracts', 'Deploy Vesper core contracts')
  .addParam('pool', 'Vesper pool name')
  .addOptionalParam('release', 'Vesper release semantic version. It will create release file under /releases directory')
  .addOptionalParam('targetChain', 'Target chain where contracts will be deployed')
  .addOptionalParam('deployParams', "Run 'npx hardhat deploy --help' to see all supported params")
  .addOptionalParam('strategyName', 'Vesper strategy name to deploy')
  .addOptionalParam('strategyConfig', 'Vesper strategy configuration')
  .addOptionalParam('multisigNonce', 'Starting nonce number to propose Gnosis safe multisig transaction')
  .addOptionalParam('oldStrategyName', 'Old Strategy name (needed in case contract name is changed during migration)')
  .setAction(async function ({
    pool,
    release,
    targetChain = 'mainnet',
    deployParams = {},
    strategyName,
    strategyConfig,
    multisigNonce,
    oldStrategyName,
  }) {
    const hreNetwork = hre.network.name
    // When deploying on localhost, we can provide targetChain param to support chain other than mainnet
    if (hreNetwork !== 'localhost') {
      targetChain = hreNetwork
    }
    // Set pool config in hre to use later in deploy scripts
    hre.poolConfig = require(`../helper/${targetChain}/poolConfig`)[pool]
    hre.poolName = pool.toLowerCase()

    validatePoolConfig(hre.poolConfig, targetChain)

    // Set target chain in hre
    hre.targetChain = targetChain

    if (typeof deployParams === 'string') {
      deployParams = JSON.parse(deployParams)
    }

    if (!deployParams.tags) {
      deployParams.tags = pool
    }

    await run('strategy-configuration', { strategyName, targetChain, strategyConfig, multisigNonce, oldStrategyName })

    await deployCoreContracts(pool, deployParams, release)
  })

module.exports = { deployCoreContracts }
