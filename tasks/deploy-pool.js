'use strict'

const del = require('del')
const copy = require('recursive-copy')
const fs = require('fs')

/* eslint-disable no-param-reassign */
task('deploy-pool', 'Deploy vesper pool')
  .addParam('pool', 'Vesper pool name')
  .addOptionalParam('release', 'Vesper release semantic version, i.e 1.2.3')
  .addOptionalParam('tags', 'tag of deploy scripts to execute, separated by commas. Default to pool name')
  .setAction(async function ({ pool, release, tags }) {
    if (!tags) {
      tags = pool
    }
    const network = hre.network.name
    const networkDir = `./deployments/${network}`

    console.log('Task args are', pool, release)
    pool = pool.toLowerCase()
    const poolDir = `${networkDir}/${pool}`

    // Copy source directory, solcInputs. do not copy v(pool) directory and DefaultProxyAdmin.json
    const copyFilter = ['*', 'solcInputs/*', '!v*', '!DefaultProxyAdmin.json']

    // Copy files from pool directory to network directory for deployment
    if (fs.existsSync(poolDir)) {
      await copy(poolDir, networkDir, { filter: copyFilter })
    }

    try {
      await run('deploy', { tags })
    } catch (e) {
      console.log('Error while deploying', tags, e)
    }
    // Copy files from network directory to pool specific directory after deployment
    // Note: This operation will overwrite files. Anything start with dot(.) will not be copied
    await copy(networkDir, poolDir, { overwrite: true, filter: copyFilter })

    // Delete all json files except DefaultProxyAdmin.json. Also delete solcInputs directory
    // Anything start with dot(.) will not be deleted
    const deleteFilter = [`${networkDir}/*.json`, `${networkDir}/solcInputs`, `!${networkDir}/DefaultProxyAdmin.json`]
    // Delete copied files from network directory
    del.sync(deleteFilter)
  })

module.exports = {}