'use strict'

const Address = require('../../helper/mainnet/address')
const PoolAccountant = 'PoolAccountant'
const EarnVesperMakerStrategyETH = 'EarnVesperMakerStrategyETH'
const { BigNumber } = require('ethers')
const DECIMAL18 = BigNumber.from('1000000000000000000')
const ONE_MILLION = DECIMAL18.mul('1000000')
const config = {
  feeCollector: Address.FEE_COLLECTOR,
  interestFee: '1500',
  debtRatio: '0',
  debtRate: ONE_MILLION.toString(),
  withdrawFee: 60,
}
const deployFunction = async function ({ getNamedAccounts, deployments }) {
  const { deploy, execute } = deployments
  const { deployer } = await getNamedAccounts()
  console.log('deployer', deployer)
  const poolProxy = await deployments.get('VETH')
  const earnStratMaker = await deploy(EarnVesperMakerStrategyETH, {
    from: deployer,
    log: true,
    args: [poolProxy.address, Address.COLLATERAL_MANAGER, Address.SWAP_MANAGER, Address.vaDAI],
  })
  await execute(EarnVesperMakerStrategyETH, { from: deployer, log: true }, 'init', Address.ADDRESS_LIST_FACTORY)
  await execute(EarnVesperMakerStrategyETH, { from: deployer, log: true }, 'approveToken')
  await execute(EarnVesperMakerStrategyETH, { from: deployer, log: true }, 'createVault')
  await execute(EarnVesperMakerStrategyETH, { from: deployer, log: true }, 'updateFeeCollector', config.feeCollector)
  await execute(EarnVesperMakerStrategyETH, { from: deployer, log: true }, 'updateBalancingFactor', 250, 225)
  // Add strategy in pool accountant
  await execute(
    PoolAccountant,
    { from: deployer, log: true },
    'addStrategy',
    earnStratMaker.address,
    config.interestFee,
    config.debtRatio,
    config.debtRate,
  )
  deployFunction.id = 'veETH-DAI-vaDAI-2'
  return true
}
module.exports = deployFunction
module.exports.tags = ['veETH-DAI-vaDAI-2']
