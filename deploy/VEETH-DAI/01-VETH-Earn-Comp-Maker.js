'use strict'

const Address = require('../../helper/ethereum/address')
const PoolAccountant = 'PoolAccountant'
const EarnCompoundMakerStrategyETH = 'EarnCompoundMakerStrategyETH'
const {BigNumber} = require('ethers')
const DECIMAL18 = BigNumber.from('1000000000000000000')
const ONE_MILLION = DECIMAL18.mul('1000000')
const config = {
  feeCollector: Address.FEE_COLLECTOR,
  interestFee: '1500',
  debtRatio: '9500',
  debtRate: ONE_MILLION.toString(),
  withdrawFee: 60,
}
const mcdEthAJoin = '0x2F0b23f53734252Bda2277357e97e1517d6B042A'
const mcdEthCJoin = '0xF04a5cC80B1E94C69B48f5ee68a08CD2F09A7c3E'
const mcdWbtcJoin = '0xBF72Da2Bd84c5170618Fbe5914B0ECA9638d5eb5'
const mcdLinkJoin = '0xdFccAf8fDbD2F4805C174f856a317765B49E4a50'
const gemJoins = [mcdEthAJoin, mcdWbtcJoin, mcdLinkJoin, mcdEthCJoin]
const deployFunction = async function ({getNamedAccounts, deployments}) {
  const {deploy, execute} = deployments
  const {deployer} = await getNamedAccounts()

  const poolProxy = await deployments.get('VETH')
  // Deploy strategy for pool
  const cm = await deploy('CollateralManager', {
    from: deployer,
    log: true,
  })
  await execute('CollateralManager', {from: deployer, log: true}, 'addGemJoin', gemJoins)
  
  const earnStratMaker = await deploy(EarnCompoundMakerStrategyETH, {
    from: deployer,
    log: true,
    args: [poolProxy.address, cm.address, Address.SWAP_MANAGER],
  })

  await execute(EarnCompoundMakerStrategyETH, {from: deployer, log: true}, 'init', Address.ADDRESS_LIST_FACTORY)
  await execute(EarnCompoundMakerStrategyETH, {from: deployer, log: true}, 'approveToken')
  await execute(EarnCompoundMakerStrategyETH, {from: deployer, log: true}, 'createVault')
  await execute(EarnCompoundMakerStrategyETH, {from: deployer, log: true}, 'updateFeeCollector', config.feeCollector)
  await execute(EarnCompoundMakerStrategyETH, {from: deployer, log: true}, 'updateBalancingFactor', 275, 250)
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
  deployFunction.id = 'veETH-DAI-COMP-1'
  return true
}
module.exports = deployFunction
module.exports.tags = ['veETH-DAI-COMP-1']
