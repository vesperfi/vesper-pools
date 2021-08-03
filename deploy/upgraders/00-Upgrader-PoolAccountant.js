'use strict'

const MULTICALL = require('../../helper/ethereum/address').MULTICALL
const PoolAccountantUpgrader = 'PoolAccountantUpgrader'

const deployFunction = async function ({getNamedAccounts, deployments}) {
  const {deploy} = deployments
  const {deployer} = await getNamedAccounts()

  await deploy(PoolAccountantUpgrader, {
      from: deployer,
      log: true,
      args: [MULTICALL]
  })

  deployFunction.id = PoolAccountantUpgrader
  return true
}
module.exports = deployFunction
module.exports.tags = [PoolAccountantUpgrader]
