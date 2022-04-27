/* eslint-disable complexity */
'use strict'
const { executeOrProposeTx } = require('./deploy-strategy')
const { isDelegateOrOwner } = require('./gnosis-txn')

const deployFunction = async function ({
  getNamedAccounts,
  deployments,
  poolConfig,
  strategyConfig,
  targetChain,
  multisigNonce = 0,
  oldStrategyName,
}) {
  if (!strategyConfig) {
    throw new Error('Strategy configuration object is not created.')
  }
  const Address = require(`../helper/${targetChain}/address`)

  const { deploy, execute, read } = deployments
  const { deployer } = await getNamedAccounts()

  const poolProxy = await deployments.get(poolConfig.contractName)

  let strategyAlias = oldStrategyName || strategyConfig.alias

  const constructorArgs = [poolProxy.address, ...Object.values(strategyConfig.constructorArgs)]

  const params = {
    safe: Address.MultiSig.safe,
    deployer,
    execute,
    targetChain,
    multisigNonce,
    oldStrategyName,
  }

  if (strategyAlias.includes('Maker')) {
    // Maker strategy of any type, EarnXXXMaker, XXXMaker
    const cm = Address.Vesper.COLLATERAL_MANAGER
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

  strategyAlias = strategyConfig.alias
  // Deploy new version strategy
  const newStrategy = await deploy(strategyAlias, {
    contract: strategyConfig.contract,
    from: deployer,
    log: true,
    args: constructorArgs,
  })

  const setup = strategyConfig.setup

  params.governor = await read(poolConfig.contractName, {}, 'governor')
  params.isDelegateOrOwner =
    Address.MultiSig.safe === params.governor &&
    (await isDelegateOrOwner(Address.MultiSig.safe, deployer, params.targetChain))

  // Execute configuration transactions
  await execute(strategyAlias, { from: deployer, log: true }, 'approveToken')

  // update fee collector
  params.methodName = 'updateFeeCollector'
  params.methodArgs = [setup.feeCollector]
  await executeOrProposeTx(strategyConfig.contract, newStrategy.address, strategyAlias, params)

  // addKeeper
  for (const keeper of setup.keepers) {
    const _keepers = await read(strategyAlias, {}, 'keepers')
    if (_keepers.includes(keeper)) {
      console.log('Keeper %s already added, skipping addKeeper', keeper)
    } else {
      params.methodName = 'addKeeper'
      params.methodArgs = [keeper]
      await executeOrProposeTx(strategyConfig.contract, newStrategy.address, strategyAlias, params)
    }
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
  params.methodName = 'migrateStrategy'
  params.methodArgs = [oldStrategy.address, newStrategy.address]
  await executeOrProposeTx(poolConfig.contractName, poolProxy.address, poolConfig.contractName, params)

  const strategyVersion = await read(strategyAlias, {}, 'VERSION')
  deployFunction.id = `${strategyAlias}-v${strategyVersion}`
  return true
}
module.exports = deployFunction
module.exports.tags = ['migrate-strategy']
