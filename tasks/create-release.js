'use strict'
const fs = require('fs')
const _ = require('lodash')
const compareVersions = require('compare-versions')
const ADMIN_SLOT = '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103'
const IMPLEMENTATION_SLOT = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'

async function getProxyAdminAddress(proxyAddress) {
  const proxyAdminStorage = (await ethers.provider.getStorageAt(proxyAddress, ADMIN_SLOT)).toString()
  return ethers.utils.getAddress(`0x${proxyAdminStorage.slice(26)}`)
}

async function getImplAddress(proxyAddress) {
  const implStorage = (await ethers.provider.getStorageAt(proxyAddress, IMPLEMENTATION_SLOT)).toString()
  return ethers.utils.getAddress(`0x${implStorage.slice(26)}`)
}

async function getPoolAccountAddress(poolProxyAddress) {
  const poolProxyContract = await ethers.getContractAt('VPool', poolProxyAddress)
  const poolAccountant = await poolProxyContract.poolAccountant()
  return ethers.utils.getAddress(poolAccountant)
}

async function getPoolData(data) {
  const root = {}
  if (data.VPool) {
    root.pool = {
      proxyAdmin: await getProxyAdminAddress(data.VPool),
      proxy: data.VPool,
      implementation: await getImplAddress(data.VPool),
    }
  } else if (data.VETH) {
    root.pool = {
      proxyAdmin: await getProxyAdminAddress(data.VETH),
      proxy: data.VETH,
      implementation: await getImplAddress(data.VETH),
    }
  }
  if (data.PoolAccountant) {
    // Accountant is part of pool (Get it from chain)
    const poolAccountant = await getPoolAccountAddress(data.VETH || data.VPool)
    root.pool.poolAccountant = {
      proxyAdmin: await getProxyAdminAddress(poolAccountant),
      proxy: poolAccountant,
      implementation: await getImplAddress(poolAccountant),
    }
  }

  if (data.PoolRewards) {
    root.poolRewards = {
      proxyAdmin: await getProxyAdminAddress(data.PoolRewards),
      proxy: data.PoolRewards,
      implementation: await getImplAddress(data.PoolRewards),
    }
  }

  if (data.VesperEarnDrip) {
    root.poolRewards = {
      proxyAdmin: await getProxyAdminAddress(data.VesperEarnDrip),
      proxy: data.VesperEarnDrip,
      implementation: await getImplAddress(data.VesperEarnDrip),
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
  let releases = fs.readdirSync('releases')
  if (releases.length) {
    if (releases[0] === '.DS_Store') {
      releases.shift() // delete first element, generally found on mac machine.
    }
    releases = releases.sort(compareVersions)
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
  .setAction(async function ({ pool, release }) {
    const network = hre.network.name
    const networkDir = `./deployments/${network}`

    console.log('Task args are', pool, release)
    pool = pool.toLowerCase()
    const poolDir = `${networkDir}/${pool}`

    // Read pool deployment name and address
    const deployData = getDeploymentData(poolDir)

    const releaseDir = `releases/${release}`
    const releaseFile = `${releaseDir}/contracts.json`

    // Get previous release data
    const prevReleaseData = getPreviousRelease()
    let releaseData = {}

    // If last stored release is same as current release
    if (prevReleaseData.version === release) {
      // Update release with new deployment
      releaseData = prevReleaseData
    } else {
      // If this is new release
      // Create new release directory if doesn't exist
      if (!fs.existsSync(releaseDir)) {
        fs.mkdirSync(releaseDir, { recursive: true })
      }
      // Copy data from previous release
      releaseData = prevReleaseData
      // Update release version
      releaseData.version = release
    }
    // We might have new network in this deployment, if not exist add empty network
    if (!releaseData.networks) {
      releaseData.networks = {}
      releaseData.networks[network] = {}
    } else if (!releaseData.networks[network]) {
      releaseData.networks[network] = {}
    }
    // Update pool data with latest deployment
    releaseData.networks[network][pool] = await getPoolData(deployData)
    // Write release data into file
    fs.writeFileSync(releaseFile, JSON.stringify(releaseData, null, 2))
    console.log(`${pool.toUpperCase()} - ${network} release ${release} is created successfully!`)
  })

module.exports = {}
