'use strict'
const name = 'AaveStrategyUSDC'
const version = 'v3.0'
const {BigNumber} = require('ethers')
const DECIMAL18 = BigNumber.from('1000000000000000000')
const ONE_MILLION = DECIMAL18.mul('1000000')
const config = {
  feeCollector: '0x223809E09ec28C28219769C3FF05c790c213152C',
  interestFee: '1500', debtRatio: '2000', debtRate: ONE_MILLION.toString()
}
const {ethers} = require('hardhat')

/* eslint-disable arrow-body-style */
module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy} = deployments
  const {deployer} = await getNamedAccounts()
  let vUSDC = await deployments.get('VUSDC')
  vUSDC = await  await ethers.getContractAt('VUSDC', vUSDC.address)
  const deployed = await deploy(name, {
    from: deployer,
    log: true,
    args: [vUSDC.address]
  })
  const strategy = await ethers.getContractAt(name, deployed.address)
  await strategy.init()
  await strategy.approveToken()
  await strategy.updateFeeCollector(config.feeCollector) 
  await vUSDC.addStrategy(strategy.address, config.interestFee, config.debtRatio, config.debtRate)
}
module.exports.tags = [`${name}-${version}`]
