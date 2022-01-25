'use strict'
const DefaultProxyAdmin = 'DefaultProxyAdmin'
const PoolAccountant = 'PoolAccountant'
const PoolAccountantUpgrader = 'PoolAccountantUpgrader'
const VPoolUpgrader = 'VPoolUpgrader'
async function validateAndDeployUpgrader(name, deployments, deployer, targetChain) {
  const { deploy, execute, read } = deployments
  let upgrader = await deployments.getOrNull(`${name}Upgrader`)
  const proxy = await deployments.get(name)
  const admin = await read(DefaultProxyAdmin, 'getProxyAdmin', proxy.address).catch(() => null)
  let proxyAdminOwner
  if (admin) {
    console.log('proxyAdmin of contract is default proxyAdmin. Checking ownership')
    // check ownership
    proxyAdminOwner = await read(DefaultProxyAdmin, 'owner').catch(() => null)
    if (proxyAdminOwner !== deployer) {
      throw new Error('Deployer is not owner of DefaultProxyAdmin. Cant upgrade pool')
    }
  }

  if (upgrader) {
    // Found safe upgrader contract. Check ownership
    proxyAdminOwner = await read(`${name}Upgrader`, 'owner').catch(() => null)
    if (proxyAdminOwner !== deployer) {
      throw new Error('Deployer is not owner of safe upgrader. Cant upgrade pool')
    }
  } else {
    // Deploy new custom proxy admin
    const MULTICALL = require(`../helper/${targetChain}/address`).MULTICALL
    upgrader = await deploy(`${name}Upgrader`, {
      from: deployer,
      log: true,
      args: [MULTICALL],
    })
  }

  if (admin) {
    // Contract's proxy admin is DefaultProxyAdmin. change it to safe upgrader
    console.log('changing proxy admin')
    await execute(DefaultProxyAdmin, { from: deployer, log: true }, 'changeProxyAdmin', proxy.address, upgrader.address)
  }
}

const deployFunction = async function ({ getNamedAccounts, deployments, poolConfig, targetChain }) {
  const { deploy, execute } = deployments
  const { deployer } = await getNamedAccounts()

  await validateAndDeployUpgrader(poolConfig.contractName, deployments, deployer, targetChain)

  const vPoolImpl = await deploy(`${poolConfig.contractName}_Implementation`, {
    contract: poolConfig.contractName,
    from: deployer,
    log: true,
    args: poolConfig.poolParams,
  })

  let proxy = await deployments.get(poolConfig.contractName)

  await execute(VPoolUpgrader, { from: deployer, log: true }, 'safeUpgrade', proxy.address, vPoolImpl.address)

  await validateAndDeployUpgrader(PoolAccountant, deployments, deployer, targetChain)
  // const proxy = await deployments.get(name)
  // Deploy a new implementation
  const poolAccountantImpl = await deploy(`${PoolAccountant}_Implementation`, {
    contract: PoolAccountant,
    from: deployer,
    log: true,
  })

  proxy = await deployments.get(PoolAccountant)
  // Finally, trigger a safe upgrade via the upgrader
  await execute(
    PoolAccountantUpgrader,
    { from: deployer, log: true },
    'safeUpgrade',
    proxy.address,
    poolAccountantImpl.address,
  )
  deployFunction.id = 'upgrade-pool'
  return true
}
module.exports = deployFunction
module.exports.tags = ['upgrade-pool']
