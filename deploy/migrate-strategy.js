'use strict'

const deployFunction = async function ({ getNamedAccounts, deployments, poolConfig, strategyConfig, targetChain }) {
  const Address = require(`../helper/${targetChain}/address`)

  const { deploy, execute, read } = deployments
  const { deployer } = await getNamedAccounts()

  const poolProxy = await deployments.get(poolConfig.contractName)

  let strategyAlias = strategyConfig.contractName
  const constructorArgs = [poolProxy.address, strategyConfig.swapManager]

  // Rari strategy requires fusePoolId
  if (strategyAlias === 'RariFuseStrategy') {
    const fusePoolId = strategyConfig.fusePoolId
    constructorArgs.push(fusePoolId)
    strategyAlias = `${strategyAlias}#${fusePoolId}`
  } else if (strategyAlias.toUpperCase().includes('MAKER')) {
    // Maker strategy of any type, EarnXXXMaker, XXXMaker
    const cm = Address.COLLATERAL_MANAGER
    if (!cm) {
      // For migrate we expect Collateral Manager to be deployed
      throw new Error('Collateral Manager address is missing in address.json')
    }
    // Fail fast: By reading any property we make sure deployment object exist for CollateralManager
    await read('CollateralManager', {}, 'treasury')
    constructorArgs[1] = cm
    constructorArgs[2] = strategyConfig.swapManager

    // VesperMaker and EarnVesperMaker strategy require 1 extra param
    if (strategyAlias.toUpperCase().includes('VESPER')) {
      constructorArgs.push(strategyConfig.growPool)
    }
  }

  // Get old strategy. It is very important to get it first as new deploy will overwrite it
  const oldStrategy = await deployments.get(strategyAlias)

  // Deploy new version strategy
  const newStrategy = await deploy(strategyAlias, {
    contract: strategyConfig.contractName,
    from: deployer,
    log: true,
    args: constructorArgs,
  })

  // Execute configuration transactions
  await execute(strategyAlias, { from: deployer, log: true }, 'init', strategyConfig.addressListFactory)
  await execute(strategyAlias, { from: deployer, log: true }, 'approveToken')
  await execute(strategyAlias, { from: deployer, log: true }, 'updateFeeCollector', strategyConfig.feeCollector)
  await execute(strategyAlias, { from: deployer, log: true }, 'addKeeper', strategyConfig.keeper)

  // For earn strategies approve grow token
  if (strategyAlias.toUpperCase().includes('EARN')) {
    await execute(strategyAlias, { from: deployer, log: true }, 'approveGrowToken')
  }

  // Execute Maker related configuration transactions
  if (strategyAlias.toUpperCase().includes('MAKER')) {
    const { highWater, lowWater } = strategyConfig.maker
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
