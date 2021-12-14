'use strict'

const _ = require('lodash')
const del = require('del')
const copy = require('recursive-copy')
const fs = require('fs')

// Validate given keys exists in given object
function validateObject(object, keys) {
  keys.forEach(function (key) {
    if (!_.has(object, key)) {
      throw new Error(`${key} is missing in pool config`)
    }
  })
}

function validatePoolConfig(poolConfig) {
  const topLevelKeys = ['contractName', 'poolParams', 'setup', 'rewards']
  // Validate top level properties in config object
  validateObject(poolConfig, topLevelKeys)

  // Validate pool params
  if (poolConfig.poolParams.length !== 3) {
    throw new Error('Incorrect pool params. Pool name, symbol and token are required')
  }

  // Validate setup in config object
  const setupKeys = ['addressListFactory', 'feeCollector', 'withdrawFee']
  validateObject(poolConfig.setup, setupKeys)

  // Validate rewards in config object
  let rewardsKeys = ['contract', 'tokens']
  if (poolConfig.poolParams[0].includes('Earn')) {
    rewardsKeys = ['contract', 'tokens', 'growToken']
    validateObject(poolConfig.rewards, rewardsKeys)
    if (!poolConfig.rewards.tokens.includes(poolConfig.rewards.growToken)) {
      throw new Error('Grow token should be part of tokens array in rewards config')
    }
    if (poolConfig.rewards.contract !== 'VesperEarnDrip') {
      throw new Error('Wrong contract name for Earn Rewards pool')
    }
  } else {
    validateObject(poolConfig.rewards, rewardsKeys)
    if (poolConfig.rewards.contract !== 'PoolRewards') {
      throw new Error('Wrong contract name for Rewards Pool')
    }
  }
}

/* eslint-disable no-param-reassign, complexity */
task('deploy-pool', 'Deploy vesper pool')
  .addParam('pool', 'Vesper pool name')
  .addOptionalParam('release', 'Vesper release semantic version. It will create release file under /releases directory')
  .addOptionalParam('targetChain', 'Target chain where contracts will be deployed')
  .addOptionalParam('deployParams', "Run 'npx hardhat deploy --help' to see all supported params")
  .addOptionalParam('strategyName', 'Vesper strategy name to deploy')
  .setAction(async function ({ pool, release, targetChain = 'mainnet', deployParams = {}, strategyName }) {
    const hreNetwork = hre.network.name
    // When deploying on localhost, we can provide targetChain param to support chain other than mainnet
    if (hreNetwork !== 'localhost') {
      targetChain = hreNetwork
    }

    // Set target chain in hre
    hre.targetChain = targetChain

    if (typeof deployParams === 'string') {
      deployParams = JSON.parse(deployParams)
    }

    if (!deployParams.tags) {
      deployParams.tags = pool
    }

    const poolConfig = require(`../helper/${targetChain}/poolConfig`)[pool.toUpperCase()]
    // Fail fast
    if (!poolConfig) {
      throw new Error(`Missing pool configuration in /helper/${targetChain}/poolConfig file`)
    }
    validatePoolConfig(poolConfig)
    // Set pool config in hre to use later in deploy scripts
    hre.poolConfig = poolConfig

    await run('strategy-configuration', { strategyName, targetChain })

    const networkDir = `./deployments/${hreNetwork}`
    let deployer = process.env.DEPLOYER
    if (deployer && deployer.startsWith('ledger')) {
      deployer = deployer.split('ledger://')[1]
    }
    console.log(
      `Running deploy script on ${hreNetwork} for '${pool} Pool on ${targetChain}' with deployPrams`,
      deployParams,
    )
    pool = pool.toLowerCase()
    const poolDir = `${networkDir}/${pool}`
    const globalDir = `${networkDir}/global`
    const deployerDir = `${globalDir}/${deployer}`

    try {
      // Copy files from pool directory to network directory for deployment
      if (fs.existsSync(poolDir)) {
        await copy(poolDir, networkDir, {
          overwrite: true,
          filter: ['*.json', 'solcInputs/*', '!DefaultProxyAdmin.json'],
        })
      }
      // Copy files from global directory to network directory for deployment
      if (fs.existsSync(globalDir)) {
        await copy(globalDir, networkDir, { overwrite: true, filter: ['*.json'] })
      }
      // Copy deployer's default proxy admin to network directory for deployment
      if (fs.existsSync(deployerDir)) {
        await copy(deployerDir, networkDir, {
          overwrite: true,
          filter: ['*.json'],
        })
      }

      await run('deploy', { ...deployParams })

      let copyFilter = ['*.json', 'solcInputs/*']

      // Do not copy global deployments into pool specific deployments
      if (fs.existsSync(globalDir)) {
        copyFilter = [...copyFilter, ...fs.readdirSync(globalDir).map(file => `!${file}`)]
      }

      // Copy files from network directory to pool specific directory after deployment
      // Note: This operation will overwrite files. Anything start with dot(.) will not be copied
      await copy(networkDir, poolDir, { overwrite: true, filter: copyFilter })
      // Copy default proxy admin to deployer directory
      await copy(networkDir, deployerDir, { overwrite: true, filter: ['DefaultProxyAdmin.json'] })
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
  })

module.exports = {}
