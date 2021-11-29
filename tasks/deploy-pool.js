'use strict'

const del = require('del')
const copy = require('recursive-copy')
const fs = require('fs')

/* eslint-disable no-param-reassign, complexity */
task('deploy-pool', 'Deploy vesper pool')
  .addParam('pool', 'Vesper pool name')
  .addOptionalParam('release', 'Vesper release semantic version. It will create release file under /releases directory')
  .addOptionalParam('targetChain', 'Target chain where contracts will be deployed')
  .addOptionalParam(
    'deployParams',
    `any param passed inside deployParams object will be passed to hardhat-deploy
  -----------------------------------------------------------------------------------------
  deploy-scripts      override deploy script folder path
  export              export current network deployments
  export-all          export all deployments into one file
  gasprice            gas price to use for transactions
  no-compile          disable pre compilation
  no-impersonation    do not impersonate unknown accounts
  reset               whether to delete deployments files first
  silent              whether to remove log
  tags                specify which deploy script to execute via tags, separated by commas
  watch               redeploy on every change of contract or deploy script
  write               whether to write deployments to file
  -----------------------------------------------------------------------------------------
  `,
  )
  .addOptionalParam(
    'poolParams',
    `any param passed inside poolParams object will be used to prepare pool configuration
  -----------------------------------------------------------------------------------------
  rewardsToken        Rewards token address for poolRewards
  -----------------------------------------------------------------------------------------
  `,
  )
  .addOptionalParam(
    'strategyParams',
    `any param passed inside strategyParam object will be used to prepare strategy configuration
  -----------------------------------------------------------------------------------------
  name                strategy contract name
  collateralToken     name of pool collateral token
  interestFee         interest fee of this strategy
  debtRatio           debt ratio for this strategy
  debtRate            debt rate of this strategy
  swapManager         swap manager address
  addressListFactory  factory address
  feeCollector        fee collector address
  keeper              address we want to add as keeper
  fusePoolId          Fuse pool id, if applicable
  -----------------------------------------------------------------------------------------
  `,
  )
  .setAction(async function ({
    pool,
    release,
    targetChain = 'mainnet',
    deployParams = {},
    poolParams = {},
    strategyParams,
  }) {
    const hreNetwork = hre.network.name
    // When deploying on localhost, we can provide targetChain param to support chain other than mainnet
    if (hreNetwork !== 'localhost') {
      targetChain = hreNetwork
    }

    // Set target chain in hre
    hre.targetChain = targetChain

    const Address = require(`../helper/${targetChain}/address`)

    if (typeof deployParams === 'string') {
      deployParams = JSON.parse(deployParams)
    }

    if (!deployParams.tags) {
      deployParams.tags = pool
    }

    if (typeof poolParams === 'string') {
      poolParams = JSON.parse(poolParams)
    } else {
      console.log('Using VSP as default pool rewards token')
      poolParams.rewardsToken = Address.VSP
    }

    hre.poolConfig = require(`../helper/${targetChain}/poolConfig`)[pool.toUpperCase()]
    // TODO There is room for improvement for whole pool deployment stuff IMO
    hre.poolConfig.rewardsToken = poolParams.rewardsToken
    await run('strategy-configuration', { strategyParams })

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
