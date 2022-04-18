/* eslint-disable complexity */
'use strict'

const { ethers } = require('hardhat')
const { isDelegateOrOwner, getMultiSigNonce, submitGnosisTxn } = require('./gnosis-txn')
const CollateralManager = 'CollateralManager'
const PoolAccountant = 'PoolAccountant'
let multiSigNonce = 0

function sleep(ms) {
  console.log(`waiting for ${ms} ms`)
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function sendGnosisSafeTxn(encodedData, safe, deployer, nonce) {
  const txnParams = {
    data: encodedData.data,
    to: encodedData.to,
    safe,
    nonce,
    sender: deployer,
  }
  await submitGnosisTxn(txnParams)
}

async function executeOrProposeTx(contractName, contractAddress, alias, params) {
  await sleep(5000)
  if (params.governor === params.deployer) {
    params.methodArgs
      ? await params.execute(alias, { from: params.deployer, log: true }, params.methodName, ...params.methodArgs)
      : await params.execute(alias, { from: params.deployer, log: true }, params.methodName)
  } else if (params.isDelegateOrOwner) {
    const contract = await ethers.getContractAt(contractName, contractAddress)
    multiSigNonce = multiSigNonce === 0 ? (await getMultiSigNonce(params.safe)).nonce : multiSigNonce + 1
    const data = params.methodArgs
      ? await contract.populateTransaction[params.methodName](...params.methodArgs)
      : await contract.populateTransaction[params.methodName]()
    await sendGnosisSafeTxn(data, params.safe, params.deployer, multiSigNonce)
  } else {
    console.log(`Pool governor is not deployer, skipping ${params.methodName} operation`)
  }
}

const deployFunction = async function ({ getNamedAccounts, deployments, poolConfig, strategyConfig, targetChain }) {
  if (!strategyConfig) {
    throw new Error('Strategy configuration object is not created.')
  }
  const Address = require(`../helper/${targetChain}/address`)

  const { deploy, execute, read } = deployments
  const { deployer } = await getNamedAccounts()
  const params = {
    safe: Address.MultiSig.safe,
    deployer,
    execute,
  }

  const poolProxy = await deployments.get(poolConfig.contractName)
  const strategyAlias = strategyConfig.alias

  const constructorArgs = [poolProxy.address, ...Object.values(strategyConfig.constructorArgs)]

  // TODO move it to strategy-configuration?, so far read() is blocker in moving it
  if (strategyAlias.includes('Maker')) {
    // Maker strategy of any type, EarnXXXMaker, XXXMaker
    // TODO move this to constructorArgs?
    let cm = Address.Vesper.COLLATERAL_MANAGER
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
  params.governor = await read(poolConfig.contractName, {}, 'governor')
  params.isDelegateOrOwner =
    Address.MultiSig.safe === params.governor && (await isDelegateOrOwner(Address.MultiSig.safe, deployer))

  // update fee collector
  params.methodName = 'updateFeeCollector'
  params.methodArgs = [setup.feeCollector]
  await executeOrProposeTx(strategyConfig.contract, deployed.address, strategyConfig.alias, params)

  // addKeeper
  for (const keeper of setup.keepers) {
    const _keepers = await read(strategyAlias, {}, 'keepers')
    if (_keepers.includes(keeper)) {
      console.log('Keeper %s already added, skipping addKeeper', keeper)
    } else {
      params.methodName = 'addKeeper'
      params.methodArgs = [keeper]
      await executeOrProposeTx(strategyConfig.contract, deployed.address, strategyConfig.alias, params)
    }
  }

  // Execute Maker related configuration transactions
  if (strategyAlias.includes('Maker')) {
    // Check whether gemJoin already added(or old version) in CM or not
    const collateralType = await (await ethers.getContractAt('GemJoinLike', setup.maker.gemJoin)).ilk()
    const gemJoinInCM = await read(CollateralManager, {}, 'mcdGemJoin', collateralType)
    if (gemJoinInCM !== setup.maker.gemJoin) {
      params.methodName = 'addGemJoin'
      params.methodArgs = [setup.maker.gemJoin]
      await executeOrProposeTx(CollateralManager, Address.Vesper.COLLATERAL_MANAGER, CollateralManager, params)
    }

    params.methodName = 'createVault'
    params.methodArgs = ''
    await executeOrProposeTx(strategyConfig.contract, deployed.address, strategyConfig.alias, params)

    params.methodName = 'updateBalancingFactor'
    params.methodArgs = [setup.maker.highWater, setup.maker.lowWater]
    await executeOrProposeTx(strategyConfig.contract, deployed.address, strategyConfig.alias, params)
  }

  const config = strategyConfig.config
  const poolAccountantAddress = (await deployments.get(PoolAccountant)).address
  params.methodName = 'addStrategy'
  params.methodArgs = [deployed.address, config.debtRatio, config.externalDepositFee]
  await executeOrProposeTx(PoolAccountant, poolAccountantAddress, PoolAccountant, params)

  return true
}
module.exports = deployFunction
module.exports.tags = ['deploy-strategy']
