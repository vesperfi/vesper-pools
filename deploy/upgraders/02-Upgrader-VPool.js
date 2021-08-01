'use strict'

const MULTICALL = require('../../helper/ethereum/address').MULTICALL
const VPoolUpgrader = 'VPoolUpgrader'

const deployFunction = async function ({getNamedAccounts, deployments}) {
  const {deploy} = deployments
  const {deployer} = await getNamedAccounts()

  await deploy(VPoolUpgrader, {
      from: deployer,
      log: true,
      args: [MULTICALL]
  })

  deployFunction.id = VPoolUpgrader
  return true
}
module.exports = deployFunction
module.exports.tags = [VPoolUpgrader]
