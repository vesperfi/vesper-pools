/* eslint-disable complexity */
'use strict'

const { ethers } = require('hardhat')
const CollateralManager = 'CollateralManager'
function sleep(ms) {
  console.log(`waiting for ${ms} ms`)
  return new Promise(resolve => setTimeout(resolve, ms))
}
const deployFunction = async function ({ getNamedAccounts, deployments, poolConfig, strategyConfig, targetChain }) {
  if (!strategyConfig) {
    throw new Error('Strategy configuration object is not created.')
  }
  const Address = require(`../helper/${targetChain}/address`)

  const { deploy, execute, read } = deployments
  const { deployer } = await getNamedAccounts()

  const deploymentName = poolConfig.deploymentName ? poolConfig.deploymentName : poolConfig.contractName
  const poolProxy = await deployments.get(deploymentName)

  const strategyAlias = strategyConfig.alias

  const constructorArgs = [poolProxy.address, ...Object.values(strategyConfig.constructorArgs)]

  // TODO move it to strategy-configuration?, so far read() is blocker in moving it
  if (strategyAlias.includes('Maker')) {
    // Maker strategy of any type, EarnXXXMaker, XXXMaker
    // TODO move this to constructorArgs?
    let cm = Address.COLLATERAL_MANAGER
    if (!cm) {
      // Deploy collateral manager
      await sleep(5000)
      cm = (await deploy(CollateralManager, { from: deployer, log: true, waitConfirmations: 2 })).address
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
  await sleep(5000)
  const deployed = await deploy(strategyAlias, {
    contract: strategyConfig.contract,
    from: deployer,
    log: true,
    args: constructorArgs,
    waitConfirmations: 2,
  })

  const setup = strategyConfig.setup

  // Execute setup transactions
  await sleep(5000)
  await execute(strategyAlias, { from: deployer, log: true }, 'approveToken')

  // For earn strategies approve grow token
  if (strategyAlias.includes('Earn')) {
    await sleep(5000)
    await execute(strategyAlias, { from: deployer, log: true }, 'approveGrowToken')
  }

  if (strategyAlias.toUpperCase().includes('CONVEX')) {
    await sleep(5000)
    await execute(strategyAlias, { from: deployer, log: true }, 'setRewardTokens', [])
  }

  const strategyVersion = await read(strategyAlias, {}, 'VERSION')
  deployFunction.id = `${strategyAlias}-v${strategyVersion}`

  const governor = await (await ethers.getContractAt(deploymentName, poolProxy.address)).governor()
  // skip if deployer is not pool governor
  if (governor !== deployer) {
    console.log('*** updateFeeCollector, addKeeper, addStrategy are skipped as deployer is not pool governor ***')
    if (strategyAlias.includes('Maker')) {
      console.log('*** addGemJoin, createVault, updateBalancingFactor are skipped as deployer is not pool governor ***')
    }
    return true
  }

  await sleep(5000)
  await execute(strategyAlias, { from: deployer, log: true }, 'updateFeeCollector', setup.feeCollector)
  for (const keeper of setup.keepers) {
    await sleep(5000)
    const _keepers = await (await ethers.getContractAt(strategyConfig.contract, deployed.address)).keepers()
    if (_keepers.includes(keeper)) {
      console.log('Keeper %s already added, skipping addKeeper', keeper)
    } else {
      await execute(strategyAlias, { from: deployer, log: true }, 'addKeeper', keeper)
    }
  }

  // Execute Maker related configuration transactions
  if (strategyAlias.includes('Maker')) {
    const maker = setup.maker
    // Check whether gemJoin already added(or old version) in CM or not
    const collateralType = await (await ethers.getContractAt('GemJoinLike', maker.gemJoin)).ilk()
    const gemJoinInCM = await read(CollateralManager, {}, 'mcdGemJoin', collateralType)
    if (gemJoinInCM !== maker.gemJoin) {
      await sleep(5000)
      await execute('CollateralManager', { from: deployer, log: true }, 'addGemJoin', [maker.gemJoin])
    }
    await sleep(5000)
    await execute(strategyAlias, { from: deployer, log: true }, 'createVault')

    await sleep(5000)
    await execute(
      strategyAlias,
      { from: deployer, log: true },
      'updateBalancingFactor',
      maker.highWater,
      maker.lowWater,
    )
  }

  let PoolAccountant = 'PoolAccountant'
  if (strategyAlias.includes('Coverage')) {
    PoolAccountant = 'PoolAccountantCoverage'
  } else if (strategyAlias.includes('Stable')) {
    PoolAccountant = 'PoolAccountantStable'
  }

  // Add strategy in pool accountant
  const config = strategyConfig.config
  await sleep(5000)
  await execute(
    PoolAccountant,
    { from: deployer, log: true },
    'addStrategy',
    deployed.address,
    config.interestFee,
    config.debtRatio,
    config.debtRate,
    config.externalDepositFee,
  )
  return true
}
module.exports = deployFunction
module.exports.tags = ['deploy-strategy']
