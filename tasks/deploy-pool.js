'use strict'

const del = require('del')
const copy = require('recursive-copy')
const fs = require('fs')

/* eslint-disable no-param-reassign */
task('deploy-pool', 'Deploy vesper pool')
  .addParam('pool', 'Vesper pool name')
  .addOptionalParam('release', 'Vesper release semantic version. It will create release file under /releases directory')
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
  `
  )
  .setAction(async function ({pool, release, deployParams = {}}) {
    if (typeof deployParams === 'string') {
      deployParams = JSON.parse(deployParams)
    }

    if (!deployParams.tags) {
      deployParams.tags = pool
    }
    const network = hre.network.name
    const networkDir = `./deployments/${network}`
    console.log(`Deploying ${pool} on ${network} with deployParams`, deployParams)
    pool = pool.toLowerCase()
    const poolDir = `${networkDir}/${pool}`
    const globalDir = `${networkDir}/global`

    try {
      // Copy files from pool directory to network directory for deployment
      if (fs.existsSync(poolDir)) {
        await copy(poolDir, networkDir, {
          overwrite: true,
          filter: ['*.json', 'solcInputs/*']
        })
      }

      if (poolDir !== globalDir) {
        // Only if not operating on the global pool
        // Copy files from global directory to network directory for deployment
        if (fs.existsSync(globalDir)) {
          await copy(globalDir, networkDir, {
            overwrite: true,
            filter: ['*.json']
          })
        }
      }

      await run('deploy', {...deployParams})

      let copyFilter = ['*.json', 'solcInputs/*', '!DefaultProxyAdmin.json']
      if (poolDir !== globalDir) {
        // Only if not operating on the global pool
        // Do not copy global deployments into pool specific deployments
        if (fs.existsSync(globalDir)) {
          copyFilter = [...copyFilter, ...fs.readdirSync(globalDir).map(file => `!${file}`)]
        }
      }

      // Copy files from network directory to pool specific directory after deployment
      // Note: This operation will overwrite files. Anything start with dot(.) will not be copied
      await copy(networkDir, poolDir, {overwrite: true, filter: copyFilter})
    } 
    catch (error) {
      // in case fail. copy and save it for review
      const filter = [`${networkDir}/*.json`, `${networkDir}/solcInputs`, `!${networkDir}/DefaultProxyAdmin.json`]
      await copy(networkDir, `${networkDir}/failed/${pool}`, {overwrite: true, filter})
    }
    finally {
      // Delete all json files except DefaultProxyAdmin.json. Also delete solcInputs directory
      // Anything start with dot(.) will not be deleted
      const deleteFilter = [`${networkDir}/*.json`, `${networkDir}/solcInputs`, `!${networkDir}/DefaultProxyAdmin.json`]
      // Delete copied files from network directory
      del.sync(deleteFilter)
    }

    if (release) {
      await run('create-release', {pool, release})
    }
  })

module.exports = {}
