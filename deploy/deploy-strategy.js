/* eslint-disable complexity */
'use strict'

const { ethers } = require('hardhat')
const { isDelegateOrOwner, proposeMultiTxn, prepareTxn } = require('./gnosis-txn')
const CollateralManager = 'CollateralManager'
const PoolAccountant = 'PoolAccountant'

function sleep(ms) {
  console.log(`waiting for ${ms} ms`)
  return new Promise(resolve => setTimeout(resolve, ms))
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

  const governor = await read(poolConfig.contractName, {}, 'governor')
  const shouldProposeTx =
    Address.MultiSig.safe === governor && (await isDelegateOrOwner(Address.MultiSig.safe, deployer, targetChain))
  if (deployer !== governor && !shouldProposeTx) {
    console.log('Deployer is not governor and delegate of governor. Rest of configuration must be handled manually')
    return
  }
  const strategyOps = {
    alias: strategyAlias,
    contractName: strategyConfig.contract,
    contractAddress: deployed.address,
  }
  const operations = [
    {
      ...strategyOps,
      params: ['updateFeeCollector', [setup.feeCollector]],
    },
  ]

  for (const keeper of setup.keepers) {
    const _keepers = await read(strategyAlias, {}, 'keepers')
    if (!_keepers.includes(ethers.utils.getAddress(keeper))) {
      const params = ['addKeeper', [keeper]]
      operations.push({ ...strategyOps, params })
    }
  }

  if (strategyAlias.includes('Maker')) {
    const collateralType = await (await ethers.getContractAt('GemJoinLike', setup.maker.gemJoin)).ilk()
    const gemJoinInCM = await read(CollateralManager, {}, 'mcdGemJoin', collateralType)
    if (gemJoinInCM !== setup.maker.gemJoin) {
      operations.push({
        alias: CollateralManager,
        contractName: CollateralManager,
        contractAddress: Address.Vesper.COLLATERAL_MANAGER,
        params: ['addGemJoin', [setup.maker.gemJoin]],
      })
    }
    operations.push({
      ...strategyOps,
      params: ['createVault', []],
    })
    operations.push({
      ...strategyOps,
      params: ['updateBalancingFactor', [setup.maker.highWater, setup.maker.lowWater]],
    })
  }

  const config = strategyConfig.config
  const poolAccountantAddress = (await deployments.get(PoolAccountant)).address

  operations.push({
    alias: PoolAccountant,
    contractName: PoolAccountant,
    contractAddress: poolAccountantAddress,
    params: ['addStrategy', [deployed.address, config.debtRatio, config.externalDepositFee]],
  })

  const bundleTxs = []
  for (const operation of operations) {
    if (shouldProposeTx) {
      console.log(`preparing multisig tx for ${operation.params[0]}`)
      bundleTxs.push(await prepareTxn(operation.contractName, operation.contractAddress, ...operation.params))
    } else {
      await sleep(5000)
      await execute(operation.alias, { from: deployer, log: true }, ...operation.params)
    }
  }
  if (bundleTxs.length > 0) {
    console.log('Sending multisig tx')
    await proposeMultiTxn(targetChain, deployer, multisigNonce, bundleTxs, Address.MultiSend)
  }
}
module.exports = deployFunction
module.exports.tags = ['deploy-strategy']
