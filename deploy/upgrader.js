'use strict'

const deployFunction = async function ({ getNamedAccounts, deployments, targetChain, name }) {
  const MULTICALL = require(`../helper/${targetChain}/address`).MULTICALL

  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  await deploy(name, {
    from: deployer,
    log: true,
    args: [MULTICALL],
  })

  deployFunction.id = name
  return true
}
module.exports = deployFunction
module.exports.tags = ['upgrader']
