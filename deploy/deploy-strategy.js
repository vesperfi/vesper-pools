'use strict'

const { ethers } = require('hardhat')
const PoolAccountant = 'PoolAccountant'
const CollateralManager = 'CollateralManager'

/* eslint-disable complexity */
const deployFunction = async function ({ getNamedAccounts, deployments, poolConfig, strategyConfig, targetChain }) {
  const Address = require(`../helper/${targetChain}/address`)

  const { deploy, execute, read } = deployments
  const { deployer } = await getNamedAccounts()

  const poolProxy = await deployments.get(poolConfig.contractName)

  let strategyAlias = strategyConfig.contractName

  const constructorArgs = [poolProxy.address, strategyConfig.swapManager]

  // NOTICE:: This is temporary fix, future version will always read alias from strategy config
  // TODO Once sol update is done, read whole constructorArgs object from strategy cofig
  if (strategyAlias.startsWith('EarnAaveStrategy') || strategyAlias.startsWith('AaveStrategy')) {
    strategyAlias = strategyConfig.alias
    // Push receiptToken, dripToken(only for earnAave) and strategyName. This has to be in this order
    constructorArgs.push(strategyConfig.receiptToken)
    if (strategyAlias.startsWith('EarnAaveStrategy')) {
      constructorArgs.push(strategyConfig.dripToken)
    }
    constructorArgs.push(strategyAlias)
  }

  // Rari strategy requires fusePoolId
  if (strategyAlias === 'RariFuseStrategy') {
    const fusePoolId = strategyConfig.fusePoolId
    constructorArgs.push(fusePoolId)
    strategyAlias = `${strategyAlias}#${fusePoolId}`
  } else if (strategyAlias.toUpperCase().includes('MAKER')) {
    // Maker strategy of any type, EarnXXXMaker, XXXMaker
    let cm = Address.COLLATERAL_MANAGER
    if (!cm) {
      // Deploy collateral manager
      cm = (await deploy(CollateralManager, { from: deployer, log: true })).address
    }
    // Fail fast: By reading any property we make sure deployment object exist for CollateralManager
    await read(CollateralManager, {}, 'treasury')
    constructorArgs[1] = cm
    constructorArgs[2] = strategyConfig.swapManager

    // VesperMaker and EarnVesperMaker strategy require 1 extra param
    if (strategyAlias.toUpperCase().includes('VESPER')) {
      constructorArgs.push(strategyConfig.growPool)
    }
  }

  // Deploy strategy
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

  // For earn strategies approve grow token
  if (strategyAlias.toUpperCase().includes('EARN')) {
    await execute(strategyAlias, { from: deployer, log: true }, 'approveGrowToken')
  }

  // Execute Maker related configuration transactions
  if (strategyAlias.toUpperCase().includes('MAKER')) {
    const config = strategyConfig.maker
    // Check whether gemJoin already added(or old version) in CM or not
    const collateralType = await (await ethers.getContractAt('GemJoinLike', config.gemJoin)).ilk()
    const gemJoinInCM = await read(CollateralManager, {}, 'mcdGemJoin', collateralType)
    if (gemJoinInCM !== config.gemJoin) {
      await execute('CollateralManager', { from: deployer, log: true }, 'addGemJoin', [config.gemJoin])
    }
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
