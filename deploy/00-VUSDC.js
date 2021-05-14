'use strict'
const name = 'VUSDC'
const version = 'v3.0'
const {ethers} = require('hardhat')
/* eslint-disable arrow-body-style */
module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy} = deployments
  const {deployer} = await getNamedAccounts()
  const deployed = await deploy(name, {
    from: deployer,
    log: true,
  })
  const instance = await ethers.getContractAt(name, deployed.address)
  await instance.init()
}
module.exports.tags = [`${name}-${version}`]
