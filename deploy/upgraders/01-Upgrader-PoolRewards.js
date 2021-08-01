'use strict'

const MULTICALL = require('../../helper/ethereum/address').MULTICALL
const PoolRewardsUpgrader = 'PoolRewardsUpgrader'

const deployFunction = async function ({getNamedAccounts, deployments}) {
  const {deploy} = deployments
  const {deployer} = await getNamedAccounts()

  await deploy(PoolRewardsUpgrader, {
      from: deployer,
      log: true,
      args: [MULTICALL]
  })

  deployFunction.id = PoolRewardsUpgrader
  return true
}
module.exports = deployFunction
module.exports.tags = [PoolRewardsUpgrader]
