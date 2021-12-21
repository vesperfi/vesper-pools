'use strict'

const { ethers } = require('hardhat')
const PoolAccountant = 'PoolAccountant'
const CollateralManager = 'CollateralManager'

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

  // TODO move it to strategy-configuration?, so far read() is blocker in moving it
  if (strategyAlias.includes('Maker')) {
    // Maker strategy of any type, EarnXXXMaker, XXXMaker
    // TODO move this to constructorArgs?
    let cm = Address.COLLATERAL_MANAGER
    if (!cm) {
      // Deploy collateral manager
      cm = (await deploy(CollateralManager, { from: deployer, log: true })).address
    }
    // Fail fast: By reading any property we make sure deployment object exist for CollateralManager
    try {
      await read(CollateralManager, {}, 'treasury')
    } catch (e) {
      throw new Error(`Missing Collateral Manager deployment object. 
      If you are deploying in localhost, please copy CollateralManager.json 
      from /deployments/${targetChain}/global to /deployments/localhost/global`)
    }

    // Insert cm at index 1 in constructorArgs
    constructorArgs.splice(1, 0, cm)
  }

  // Deploy strategy
  const deployed = await deploy(strategyAlias, {
    contract: strategyConfig.contract,
    from: deployer,
    log: true,
    args: constructorArgs,
  })

  const setup = strategyConfig.setup

  // Execute setup transactions
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
    const maker = setup.maker
    // Check whether gemJoin already added(or old version) in CM or not
    const collateralType = await (await ethers.getContractAt('GemJoinLike', maker.gemJoin)).ilk()
    const gemJoinInCM = await read(CollateralManager, {}, 'mcdGemJoin', collateralType)
    if (gemJoinInCM !== maker.gemJoin) {
      await execute('CollateralManager', { from: deployer, log: true }, 'addGemJoin', [maker.gemJoin])
    }
    await execute(strategyAlias, { from: deployer, log: true }, 'createVault')
    await execute(
      strategyAlias,
      { from: deployer, log: true },
      'updateBalancingFactor',
      maker.highWater,
      maker.lowWater,
    )
  }

  // Add strategy in pool accountant
  const config = strategyConfig.config
  await execute(
    PoolAccountant,
    { from: deployer, log: true },
    'addStrategy',
    deployed.address,
    config.interestFee,
    config.debtRatio,
    config.debtRate,
  )

  const strategyVersion = await read(strategyAlias, {}, 'VERSION')
  deployFunction.id = `${strategyAlias}-v${strategyVersion}`
  return true
}
module.exports = deployFunction
module.exports.tags = ['deploy-strategy']
