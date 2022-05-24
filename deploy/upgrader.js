'use strict'
const hre = require('hardhat')
const copy = require('recursive-copy')

const deployFunction = async function ({ getNamedAccounts, deployments, targetChain, name }) {
  const multiCall = require(`../helper/${targetChain}/address`).MultiCall

  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  await deploy(name, {
    from: deployer,
    log: true,
    args: [multiCall],
  })
  const hreNetwork = hre.network.name
  const networkDir = `./deployments/${hreNetwork}`
  const globalDir = `${networkDir}/global`
  const deployerDir = `${globalDir}/${deployer}`
  await copy(networkDir, deployerDir, { overwrite: true, filter: [`${name}.json`] })
  deployFunction.id = name
  return true
}
module.exports = deployFunction
module.exports.tags = ['upgrader']
