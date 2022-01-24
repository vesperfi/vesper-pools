'use strict'
const copy = require('recursive-copy')
const del = require('del')
const fs = require('fs')
const BuyBack = 'BuyBack'

/* eslint-disable no-param-reassign */
task('deploy-buyback', 'Deploy Buyback contract')
  .addOptionalParam('release', 'Vesper release semantic version. It will create release file under /releases directory')
  .addOptionalParam('targetChain', 'Target chain where contracts will be deployed')
  .addOptionalParam('deployParams', "Run 'npx hardhat deploy --help' to see all supported params")
  .setAction(async function ({ targetChain = 'mainnet', deployParams = {} }) {
    const hreNetwork = hre.network.name

    // When deploying on localhost, we can provide targetChain param to support chain other than mainnet
    // Set target chain in hre
    hre.targetChain = targetChain

    // When not using localhost, then network itself is target chain
    if (hreNetwork !== 'localhost') {
      hre.targetChain = hreNetwork
    }

    if (typeof deployParams === 'string') {
      deployParams = JSON.parse(deployParams)
    }
    deployParams.tags = BuyBack

    const networkDir = `./deployments/${hreNetwork}`
    const buybackDir = `${networkDir}/buyback`
    const copyFilter = [`${BuyBack}.json`, 'solcInputs/*']
    const deleteFilter = [`${networkDir}/${BuyBack}.json`, `${networkDir}/solcInputs/`]
    if (fs.existsSync(buybackDir)) {
      await copy(buybackDir, networkDir, { overwrite: true, filter: copyFilter })
    }
    // Deploy
    await run('deploy', { ...deployParams })

    await copy(networkDir, buybackDir, { overwrite: true, filter: copyFilter })
    del.sync(deleteFilter)
  })
module.exports = {}
