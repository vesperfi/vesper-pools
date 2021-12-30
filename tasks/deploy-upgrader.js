'use strict'
const supportedUpgraderContract = ['PoolAccountantUpgrader', 'PoolRewardsUpgrader', 'VPoolUpgrader']
/* eslint-disable no-param-reassign, complexity */
task('deploy-upgrader', 'Deploy upgrader contract')
  .addParam('name', 'Upgrader contract name, ex: PoolAccountantUpgrader, PoolRewardsUpgrader, VPoolUpgrader')
  .addOptionalParam('targetChain', 'Target chain where contracts will be deployed')
  .setAction(async function ({ name, targetChain = 'mainnet' }) {
    if (!supportedUpgraderContract.includes(name)) {
      throw new Error(`Error: invalid name: ${name}, Supported value is one of [${supportedUpgraderContract}]`)
    }
    const hreNetwork = hre.network.name
    // When deploying on localhost, we can provide targetChain param to support chain other than mainnet
    if (hreNetwork !== 'localhost') {
      targetChain = hreNetwork
    }

    // Set target chain in hre
    hre.targetChain = targetChain
    hre.name = name

    let deployer = process.env.DEPLOYER
    if (deployer && deployer.startsWith('ledger')) {
      deployer = deployer.split('ledger://')[1]
    }
    console.log(`Running deploy script on ${hreNetwork} for ${name} Contract on ${targetChain}`)
    try {
      await run('deploy', { tags: 'upgrader' })
    } catch (error) {
      if (error.message.includes('TransportStatusError')) {
        console.error('Error: Ledger device is locked. Please unlock your ledger device!')
        process.exit(1)
      } else {
        console.log(error)
      }
    }
  })

module.exports = {}
