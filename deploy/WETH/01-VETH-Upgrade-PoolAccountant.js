'use strict'

const VETH = require('../../helper/ethereum/poolConfig').VETHEarn
const EarnAaveMakerStrategyETH = 'EarnAaveMakerStrategyETH'
const Address = require('../../helper/ethereum/address')
const PoolAccountant = 'PoolAccountant'
const {BigNumber} = require('ethers')
const DECIMAL18 = BigNumber.from('1000000000000000000')
const ONE_MILLION = DECIMAL18.mul('1000000')
const config = {
  feeCollector: Address.FEE_COLLECTOR,
  interestFee: '1500',
  debtRatio: '9000',
  debtRate: ONE_MILLION.toString(),
  withdrawFee: 60,
}
const deployFunction = async function ({getNamedAccounts, deployments}) {
  const {deploy, read, execute} = deployments
  const {deployer} = await getNamedAccounts()

  // Deploy PoolAccountant. This call will deploy ProxyAdmin, proxy and PoolAccountant
  await deploy(PoolAccountant, {
    from: deployer,
    log: true,
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
    },
  })
  const poolProxy = await deployments.get('VETH')
  // Deploy strategy for pool
  const earnStratMaker = await deploy(EarnAaveMakerStrategyETH, {
    from: deployer,
    log: true,
    args: [poolProxy.address, Address.COLLATERAL_MANAGER, Address.SWAP_MANAGER],
  })

  await execute(EarnAaveMakerStrategyETH, {from: deployer, log: true}, 'init', Address.ADDRESS_LIST_FACTORY)
  await execute(EarnAaveMakerStrategyETH, {from: deployer, log: true}, 'approveToken')
  await execute(EarnAaveMakerStrategyETH, {from: deployer, log: true}, 'updateFeeCollector', config.feeCollector)

  // Add strategy in pool accountant

  await execute(
    PoolAccountant,
    {from: deployer, log: true},
    'removeStrategy',
    0
  )

  await execute(
    PoolAccountant,
    {from: deployer, log: true},
    'addStrategy',
    earnStratMaker.address,
    config.interestFee,
    config.debtRatio,
    config.debtRate
  )
  // Prepare id of deployment, next deployment will be triggered if id is changed
  const poolVersion = await read(VETH.contractName, {}, 'VERSION')
  const poolAccountantVersion = await read(PoolAccountant, {}, 'VERSION')
  deployFunction.id = `${VETH.poolParams[1]}-v${poolVersion}_${poolAccountantVersion}`
  return true
}
module.exports = deployFunction
module.exports.tags = ['VETH-UPGRADE-3.0.5']
