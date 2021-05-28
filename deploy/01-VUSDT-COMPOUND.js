'use strict'
const poolName = 'VUSDT'
const strategyName = 'CompoundStrategyUSDT'
const version = 'v3.0.3'
const {BigNumber} = require('ethers')
const DECIMAL18 = BigNumber.from('1000000000000000000')
const ONE_MILLION = DECIMAL18.mul('1000000')
const config = {
  feeCollector: '0x223809E09ec28C28219769C3FF05c790c213152C',
  interestFee: '1500',
  debtRatio: '9500',
  debtRate: ONE_MILLION.toString(),
}
/* eslint-disable arrow-body-style */
module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy, execute} = deployments
  const {deployer} = await getNamedAccounts()
  await deploy(poolName, {
    from: deployer,
    log: true,
  })
  await execute(poolName, {from: deployer, log: true}, 'updateFeeCollector', config.feeCollector)
  await execute(poolName, {from: deployer, log: true}, 'updateWithdrawFee', 60)


  const vUSDT = await deployments.get(poolName)
  const swapManager = '0xC48ea9A2daA4d816e4c9333D6689C70070010174'
  await deploy(strategyName, {
    from: deployer,
    log: true,
    args: [vUSDT.address, swapManager],
  })

  const strategy = await deployments.get(strategyName)
  await execute(strategyName, {from: deployer, log: true}, 'init')
  await execute(strategyName, {from: deployer, log: true}, 'approveToken')
  await execute(strategyName, {from: deployer, log: true}, 'updateFeeCollector', config.feeCollector)
  await execute(
    poolName,
    {from: deployer, log: true},
    'addStrategy',
    strategy.address,
    config.interestFee,
    config.debtRatio,
    config.debtRate
  )
}
module.exports.tags = [`${poolName}-${version}`, `${strategyName}-${version}`]