'use strict'

const Address = require('../../helper/ethereum/address')
const {ethers} = require('hardhat')
const PoolAccountant = 'PoolAccountant'
const CompoundMakerStrategyUNI = 'CompoundMakerStrategyUNI'
const {BigNumber} = require('ethers')
const DECIMAL18 = BigNumber.from('1000000000000000000')
const ONE_MILLION = DECIMAL18.mul('1000000')
const config = {
  feeCollector: Address.FEE_COLLECTOR,
  interestFee: '1500',
  debtRatio: '0',
  debtRate: ONE_MILLION.toString(),
  withdrawFee: 60,
}
const mcdUniAJoin = '0x3BC3A58b4FC1CbE7e98bB4aB7c99535e8bA9b8F1'
const gemJoins = [mcdUniAJoin]
const deployFunction = async function ({getNamedAccounts, deployments}) {
  const {deploy, execute} = deployments
  const {deployer} = await getNamedAccounts()

  const poolProxy = await deployments.get('VPool')
  // Deploy strategy for pool
  const cm = await ethers.getContractAt('CollateralManager', Address.COLLATERAL_MANAGER)
  await execute('CollateralManager', {from: deployer, log: true}, 'addGemJoin', gemJoins)
  const earnStratMaker = await deploy(CompoundMakerStrategyUNI, {
    from: deployer,
    log: true,
    args: [poolProxy.address, cm.address, Address.SWAP_MANAGER],
  })

  await execute(CompoundMakerStrategyUNI, {from: deployer, log: true}, 'init', Address.ADDRESS_LIST_FACTORY)
  await execute(CompoundMakerStrategyUNI, {from: deployer, log: true}, 'approveToken')
  await execute(CompoundMakerStrategyUNI, {from: deployer, log: true}, 'createVault')
  await execute(CompoundMakerStrategyUNI, {from: deployer, log: true}, 'updateFeeCollector', config.feeCollector)
  await execute(CompoundMakerStrategyUNI, {from: deployer, log: true}, 'updateBalancingFactor', 275, 250)
  // Add strategy in pool accountant
  await execute(
    PoolAccountant,
    {from: deployer, log: true},
    'addStrategy',
    earnStratMaker.address,
    config.interestFee,
    config.debtRatio,
    config.debtRate
  )
  deployFunction.id = 'VUNI-DAI-COMP-1'
  return true
}
module.exports = deployFunction
module.exports.tags = ['VUNI-DAI-COMP-1']
