'use strict'
const poolName = 'VUSDC'
const strategyName = 'AaveStrategyUSDC'
const version = 'v3.0'
const {BigNumber} = require('ethers')
const DECIMAL18 = BigNumber.from('1000000000000000000')
const ONE_MILLION = DECIMAL18.mul('1000000')
const config = {
  feeCollector: '0x223809E09ec28C28219769C3FF05c790c213152C',
  interestFee: '1500', debtRatio: '9000', debtRate: ONE_MILLION.toString()
}
const {ethers} = require('hardhat')
/* eslint-disable arrow-body-style */
module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy} = deployments
  const {deployer} = await getNamedAccounts()
  await deploy(poolName, {
    from: deployer,
    log: true,
  })

  let vUSDC = await deployments.get(poolName)
  const swapManager = '0xC48ea9A2daA4d816e4c9333D6689C70070010174'
  await deploy(strategyName, {
    from: deployer,
    log: true,
    args: [vUSDC.address, swapManager]
  })
  // TODO: use 'execute' method from deployments instead of signing transaction directly
  let vUSDCStrategy = await deployments.get(strategyName)
  vUSDCStrategy = await ethers.getContractAt(strategyName, vUSDCStrategy.address)
  await vUSDCStrategy.init()
  await vUSDCStrategy.approveToken()
  await vUSDCStrategy.updateFeeCollector(config.feeCollector) 
  vUSDC =  await ethers.getContractAt(poolName, vUSDC.address)
  await vUSDC.addStrategy(vUSDCStrategy.address, config.interestFee, config.debtRatio, config.debtRate)
  // TODO: add withdraw fee
}
module.exports.tags = [`${poolName}-${version}`, `${strategyName}-${version}`]
