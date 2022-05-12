/* eslint-disable complexity */
'use strict'

const { OperationType } = require('ethers-multisend')
const { ethers } = require('hardhat')
const { isDelegateOrOwner, getMultisigNonce, submitGnosisTxn } = require('./gnosis-txn')
const CollateralManager = 'CollateralManager'
const PoolAccountant = 'PoolAccountant'

function sleep(ms) {
  console.log(`waiting for ${ms} ms`)
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function sendGnosisSafeTxn(encodedData, params) {
  const baseTxn = {
    operation: OperationType.Call,
    to: ethers.utils.getAddress(encodedData.to),
    value: 0,
    data: encodedData.data || '0x',
  }
  const txnParams = {
    baseTxn,
    safe: params.safe,
    nonce: params.multisigNonce,
    sender: params.deployer,
    targetChain: params.targetChain,
  }
  await submitGnosisTxn(txnParams)
}

async function executeOrProposeTx(contractName, contractAddress, alias, params = []) {
  await sleep(5000)
  if (params.governor === params.deployer) {
    await params.execute(alias, { from: params.deployer, log: true }, params.methodName, ...params.methodArgs)
  } else if (params.isDelegateOrOwner) {
    const contract = await ethers.getContractAt(contractName, contractAddress)
    params.multisigNonce =
      params.multisigNonce === 0
        ? (await getMultisigNonce(params.safe, params.targetChain)).nonce
        : params.multisigNonce
    const data = await contract.populateTransaction[params.methodName](...params.methodArgs)
    await sendGnosisSafeTxn(data, params)
    // increase nonce number
    params.multisigNonce = parseInt(params.multisigNonce) + 1
  } else {
    console.log(`Pool governor is not deployer, skipping ${params.methodName} operation`)
  }
}

const deployFunction = async function (hre) {
  const { getNamedAccounts, deployments, poolConfig, strategyConfig, targetChain, multisigNonce = 0 } = hre
  if (!strategyConfig) {
    throw new Error('Strategy configuration object is not created.')
  }
  const Address = require(`../helper/${targetChain}/address`)

  const { deploy, execute, read } = deployments
  const { deployer } = await getNamedAccounts()
  const networkName = hre.network.name
  // Wait for 2 blocks in network is not localhost
  const waitConfirmations = networkName === 'localhost' ? 0 : 2

  const poolProxy = await deployments.get(poolConfig.contractName)
  const strategyAlias = strategyConfig.alias

  const constructorArgs = [poolProxy.address, ...Object.values(strategyConfig.constructorArgs)]

  if (strategyAlias.includes('Maker')) {
    // Maker strategy of any type, EarnXXXMaker, XXXMaker
    // TODO move this to constructorArgs?
    let cm = Address.Vesper.COLLATERAL_MANAGER
    if (!cm) {
      // Deploy collateral manager
      await sleep(5000)
      cm = (await deploy(CollateralManager, { from: deployer, log: true, waitConfirmations })).address
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
    waitConfirmations,
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

  // Below transactions will either be executed by deployer or proposed in multiSig
  const params = {
    safe: Address.MultiSig.safe,
    deployer,
    execute,
    multisigNonce,
  }
  params.governor = await read(poolConfig.contractName, {}, 'governor')
  params.targetChain = targetChain
  params.isDelegateOrOwner =
    Address.MultiSig.safe === params.governor &&
    (await isDelegateOrOwner(Address.MultiSig.safe, deployer, params.targetChain))

  // update fee collector
  params.methodName = 'updateFeeCollector'
  params.methodArgs = [setup.feeCollector]
  await executeOrProposeTx(strategyConfig.contract, deployed.address, strategyAlias, params)

  // addKeeper
  for (const keeper of setup.keepers) {
    const _keepers = await read(strategyAlias, {}, 'keepers')
    if (_keepers.includes(keeper)) {
      console.log('Keeper %s already added, skipping addKeeper', keeper)
    } else {
      params.methodName = 'addKeeper'
      params.methodArgs = [keeper]
      await executeOrProposeTx(strategyConfig.contract, deployed.address, strategyAlias, params)
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
    params.methodArgs = []
    await executeOrProposeTx(strategyConfig.contract, deployed.address, strategyAlias, params)

    params.methodName = 'updateBalancingFactor'
    params.methodArgs = [setup.maker.highWater, setup.maker.lowWater]
    await executeOrProposeTx(strategyConfig.contract, deployed.address, strategyAlias, params)
  }

  const config = strategyConfig.config
  const poolAccountantAddress = (await deployments.get(PoolAccountant)).address
  params.methodName = 'addStrategy'
  params.methodArgs = [deployed.address, config.debtRatio, config.externalDepositFee]
  await executeOrProposeTx(PoolAccountant, poolAccountantAddress, PoolAccountant, params)

  return true
}
module.exports = deployFunction
module.exports.executeOrProposeTx = executeOrProposeTx
module.exports.tags = ['deploy-strategy']
