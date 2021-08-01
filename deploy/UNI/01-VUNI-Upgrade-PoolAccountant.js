'use strict'

const VUNI = require('../../helper/ethereum/poolConfig').VUNI
const PoolAccountant = 'PoolAccountant'
const PoolAccountantUpgrader = 'PoolAccountantUpgrader'
const DefaultProxyAdmin = 'DefaultProxyAdmin'

const deployFunction = async function ({getNamedAccounts, deployments}) {
  const {deploy, execute, read} = deployments
  const {deployer} = await getNamedAccounts()

  const upgrader = await deployments.getOrNull(PoolAccountantUpgrader)
  if (upgrader) {
    // An upgrader is available, safe upgrade through it

    // First, get the PoolAccountant proxy
    const poolAccountant = await deployments.get(PoolAccountant)

    // If we get a valid admin when checking through the default proxy admin,
    // then we can be sure that the default proxy admin is the admin of the proxy
    const admin = await read(DefaultProxyAdmin, 'getProxyAdmin', poolAccountant.address).catch(() => null)
    if (admin) {
      // Transfer proxy ownership to the upgrader
      await execute(
        DefaultProxyAdmin,
        {from: deployer, log: true},
        'changeProxyAdmin',
        poolAccountant.address,
        upgrader.address
      )
    }

    // Deploy a new implementation
    const newImplementation = await deploy(`${PoolAccountant}_Implementation`, {
      contract: PoolAccountant,
      from: deployer,
      log: true
    })

    // Finally, trigger a safe upgrade via the upgrader
    await execute(
      PoolAccountantUpgrader,
      {from: deployer, log: true},
      'safeUpgrade',
      poolAccountant.address,
      newImplementation.address
    )
  } else {
    // Otherwise, fallback to unsafe upgrade through the default proxy admin
    await deploy(PoolAccountant, {
      from: deployer,
      log: true,
      proxy: {
        proxyContract: 'OpenZeppelinTransparentProxy',
      },
    })
  }

  // Prepare id of deployment, next deployment will be triggered if id is changed
  const poolVersion = await read(VUNI.contractName, {}, 'VERSION')
  const poolAccountantVersion = await read(PoolAccountant, {}, 'VERSION')
  deployFunction.id = `${VUNI.poolParams[1]}-v${poolVersion}_${poolAccountantVersion}`
  return true
}
module.exports = deployFunction
module.exports.tags = ['VUNI-UPGRADE-3.0.6']
