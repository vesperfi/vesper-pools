'use strict'

const { deployPoolContracts } = require('./deploy-pool')

/* eslint-disable no-param-reassign, complexity */
task('upgrade-pool', 'Upgrading vPool and poolAccountant')
  .addParam('pool', 'Vesper pool name')
  .addOptionalParam('release', 'Vesper release semantic version. It will create release file under /releases directory')
  .addOptionalParam('targetChain', 'Target chain where contracts will be deployed')
  .addOptionalParam('deployParams', "Run 'npx hardhat deploy --help' to see all supported params")
  .setAction(async function ({ pool, release, targetChain = 'mainnet', deployParams = {} }) {
    const hreNetwork = hre.network.name
    // When deploying on localhost, we can provide targetChain param to support chain other than mainnet
    if (hreNetwork !== 'localhost') {
      targetChain = hreNetwork
    }
    // Set target chain in hre
    hre.targetChain = targetChain

    if (typeof deployParams === 'string') {
      deployParams = JSON.parse(deployParams)
      deployParams.tags = 'upgrade-pool'
    }

    // Set pool config in hre to use later in deploy scripts
    hre.poolConfig = require(`../helper/${targetChain}/poolConfig`)[pool.toUpperCase()]
    await deployPoolContracts(pool, deployParams, release)
  })

module.exports = {}
