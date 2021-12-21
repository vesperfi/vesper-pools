'use strict'

const deployFunction = async function ({ getNamedAccounts, deployments, poolConfig, strategyConfig, targetChain }) {
  if (!strategyConfig) {
    throw new Error('Strategy configuration object is not created.')
  }
  const Address = require(`../helper/${targetChain}/address`)

  const { deploy, execute, read } = deployments
  const { deployer } = await getNamedAccounts()

  const poolProxy = await deployments.get(poolConfig.contractName)

  const strategyAlias = strategyConfig.alias

  const constructorArgs = [poolProxy.address, ...Object.values(strategyConfig.constructorArgs)]

  if (strategyAlias.includes('Maker')) {
    // Maker strategy of any type, EarnXXXMaker, XXXMaker
    const cm = Address.COLLATERAL_MANAGER
    if (!cm) {
      // For migrate we expect Collateral Manager to be deployed
      throw new Error('Collateral Manager address is missing in address.json')
    }
    // Fail fast: By reading any property we make sure deployment object exist for CollateralManager
    try {
      await read('CollateralManager', {}, 'treasury')
    } catch (e) {
      throw new Error(`Missing Collateral Manager deployment object. 
          If you are deploying in localhost, please copy CollateralManager.json 
          from /deployments/${targetChain}/global to /deployments/localhost/global`)
    }
    // Insert cm at index 1 in constructorArgs
    constructorArgs.splice(1, 0, cm)
  }

  // Get old strategy. It is very important to get it first as new deploy will overwrite it
  const oldStrategy = await deployments.get(strategyAlias)

  // Deploy new version strategy
  const newStrategy = await deploy(strategyAlias, {
    contract: strategyConfig.contract,
    from: deployer,
    log: true,
    args: constructorArgs,
  })

  const setup = strategyConfig.setup
  // Execute configuration transactions
  await execute(strategyAlias, { from: deployer, log: true }, 'approveToken')
  await execute(strategyAlias, { from: deployer, log: true }, 'updateFeeCollector', setup.feeCollector)
  for (const keeper of setup.keepers) {
    await execute(strategyAlias, { from: deployer, log: true }, 'addKeeper', keeper)
  }

  // For earn strategies approve grow token
  if (strategyAlias.includes('Earn')) {
    await execute(strategyAlias, { from: deployer, log: true }, 'approveGrowToken')
  }

  // Execute Maker related configuration transactions
  if (strategyAlias.includes('Maker')) {
    const { highWater, lowWater } = setup.maker
    await execute(strategyAlias, { from: deployer, log: true }, 'updateBalancingFactor', highWater, lowWater)
  }

  console.log(`Migrating ${strategyAlias} from ${oldStrategy.address} to ${newStrategy.address}`)

  // Migrate strategy
  await execute(
    poolConfig.contractName,
    { from: deployer, log: true },
    'migrateStrategy',
    oldStrategy.address,
    newStrategy.address,
  )

  const strategyVersion = await read(strategyAlias, {}, 'VERSION')
  deployFunction.id = `${strategyAlias}-v${strategyVersion}`
  return true
}
module.exports = deployFunction
module.exports.tags = ['migrate-strategy']
