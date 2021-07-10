'use strict'

const fs = require('fs')
const _ = require('lodash')
const PROXY_ADMIN = 'DefaultProxyAdmin'

function getPoolData(data) {
  const root = {}
  if (data.VPool) {
    root.pool = {
      proxy: data.VPool,
      implementation: data.VPool_Implementation,
    }
  } else if (data.VETH) {
    root.pool = {
      proxy: data.VETH,
      implementation: data.VETH_Implementation,
    }
  }
  if (data.PoolAccountant) {
    // Accountant is part of pool
    root.pool.poolAccountant = {
      proxy: data.PoolAccountant,
      implementation: data.PoolAccountant_Implementation,
    }
  }

  if (data.PoolRewards) {
    root.poolRewards = {
      proxy: data.PoolRewards,
      implementation: data.PoolRewards_Implementation,
    }
  }
  const strategies = {}
  Object.entries(data).map(function ([key, value]) {
    if (key.includes('Strategy')) {
      strategies[key] = value
    }
  })
  if (Object.keys(strategies).length) {
    root.strategies = strategies
  }
  return root
}

function readFileAsJson(fileName) {
  return JSON.parse(fs.readFileSync(fileName).toString())
}

function getAddress(fileName) {
  return readFileAsJson(fileName).address
}

// Return pool deployment name and address
function getDeploymentData(dirName) {
  const data = fs.readdirSync(dirName).map(function (fileName) {
    if (fileName.includes('.json')) {
      return {
        [fileName.split('.json')[0]]: getAddress(`${dirName}/${fileName}`),
      }
    }
    return {}
  })
  return _.merge(...data)
}

function getPreviousRelease() {
  const releases = fs.readdirSync('releases')
  if (releases.length) {
    const prevRelease = releases[releases.length - 1]
    const preReleaseFile = `releases/${prevRelease}/contracts.json`
    if (fs.existsSync(preReleaseFile)) {
      return readFileAsJson(preReleaseFile)
    }
  }
  return {}
}

/* eslint-disable no-param-reassign */
task('create-release', 'Create release file from deploy data')
  .addParam('pool', 'Vesper pool name')
  .addParam('release', 'Vesper release semantic version, i.e 1.2.3')
  .setAction(async function ({pool, release}) {
    const network = hre.network.name
    const networkDir = `./deployments/${network}`

    console.log('Task args are', pool, release)
    pool = pool.toLowerCase()
    const poolDir = `${networkDir}/${pool}`

    // Read pool deployment name and address
    const deployData = getDeploymentData(poolDir)
    deployData[PROXY_ADMIN] = getAddress(`${networkDir}/${PROXY_ADMIN}.json`)

    const releaseDir = `releases/${release}`
    const releaseFile = `${releaseDir}/contracts.json`

    // Get previous release data
    const prevReleaseData = getPreviousRelease()
    let releaseData = {}

    // If last stored release is same as current release
    if (prevReleaseData.version === release) {
      // Update release with new deployment
      const networkRoot = prevReleaseData.networks[network]
      // Safety check for proxy admin when release is same
      if (
        networkRoot &&
        networkRoot.defaultProxyAdmin &&
        networkRoot.defaultProxyAdmin !== deployData.DefaultProxyAdmin
      ) {
        throw new Error('Proxy admin mismatch')
      }
      releaseData = prevReleaseData
      // We might have new network in this deployment, if not exist add network and admin
      if (!releaseData.networks[network]) {
        releaseData.networks[network] = {
          defaultProxyAdmin: deployData.DefaultProxyAdmin,
        }
      }
    } else {
      // If this is new release
      // Create new release directory if doesn't exist
      if (!fs.existsSync(releaseDir)) {
        fs.mkdirSync(releaseDir, {recursive: true})
      }
      // Copy data from previous release
      releaseData = prevReleaseData
      // Update release version
      releaseData.version = release

      // If networks exist then add/update network of this deployment. Also update admin
      if (releaseData.networks) {
        // If deployment network exist then update proxy admin else add network and admin
        if (releaseData.networks[network]) {
          // Store network data
          const networkData = releaseData.networks[network]
          // Delete network data from JSON
          delete releaseData.networks[network]
          // Add network data back again with admin as first thing, just to keep order same
          releaseData.networks[network] = {
            defaultProxyAdmin: deployData.DefaultProxyAdmin,
            ...networkData,
          }
        } else {
          releaseData.networks[network] = {
            defaultProxyAdmin: deployData.DefaultProxyAdmin,
          }
        }
      } else {
        // Else define networks and add network and admin of this deployment
        releaseData.networks = {
          [network]: {
            defaultProxyAdmin: deployData.DefaultProxyAdmin,
          },
        }
      }
    }
    // Update pool data with latest deployment
    releaseData.networks[network][pool] = getPoolData(deployData)
    // Write release data into file
    fs.writeFileSync(releaseFile, JSON.stringify(releaseData, null, 2))
    console.log(`${pool.toUpperCase()} - ${network} release ${release} is created successfully!`)
  })

module.exports = {}
