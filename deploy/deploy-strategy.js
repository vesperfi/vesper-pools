'use strict'

const PoolAccountant = 'PoolAccountant'

const deployFunction = async function ({ getNamedAccounts, deployments, poolConfig, strategyConfig, targetChain }) {
  const Address = require(`../helper/${targetChain}/address`)

  const { deploy, execute, read } = deployments
  const { deployer } = await getNamedAccounts()

  const poolProxy = await deployments.get(poolConfig.contractName)

  let strategyAlias = strategyConfig.contractName
  const constructorArgs = [poolProxy.address, strategyConfig.swapManager]
  if (strategyAlias === 'RariFuseStrategy') {
    const fusePoolId = strategyConfig.fusePoolId
    if (!fusePoolId) {
      throw new Error('fusePoolId is required for RariFuseStrategy')
    }
    constructorArgs.push(fusePoolId)
    strategyAlias = `${strategyAlias}#${fusePoolId}`
  } else if (strategyAlias.toUpperCase().includes('MAKER')) {
    let cm = Address.COLLATERAL_MANAGER
    if (!cm) {
      // Deploy collateral manager
      cm = (await deploy('CollateralManager', { from: deployer, log: true })).address
    }
    // Fail fast: By reading any property we make sure deployment object exist for CollateralManager
    await read('CollateralManager', {}, 'treasury')
    constructorArgs[1] = cm
    constructorArgs[2] = strategyConfig.swapManager
  }

  const deployed = await deploy(strategyAlias, {
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

  // Execute Maker related configuration transactions
  if (strategyAlias.toUpperCase().includes('MAKER')) {
    const config = strategyConfig.maker
    await execute('CollateralManager', { from: deployer, log: true }, 'addGemJoin', config.gemJoins)
    await execute(strategyAlias, { from: deployer, log: true }, 'createVault')
    await execute(
      strategyAlias,
      { from: deployer, log: true },
      'updateBalancingFactor',
      config.highWater,
      config.lowWater,
    )
  }

  // Add strategy in pool accountant
  await execute(
    PoolAccountant,
    { from: deployer, log: true },
    'addStrategy',
    deployed.address,
    strategyConfig.interestFee,
    strategyConfig.debtRatio,
    strategyConfig.debtRate,
  )

  const strategyVersion = await read(strategyAlias, {}, 'VERSION')
  deployFunction.id = `${strategyAlias}-v${strategyVersion}`
  return true
}
module.exports = deployFunction
module.exports.tags = ['deploy-strategy']
