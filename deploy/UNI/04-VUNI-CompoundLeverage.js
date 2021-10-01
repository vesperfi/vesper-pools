'use strict'

const Address = require('../../helper/ethereum/address')
const CompoundLeverageStrategyUNI = 'CompoundLeverageStrategyUNI'

const deployFunction = async function ({getNamedAccounts, deployments}) {
  const {deploy} = deployments
  const {deployer} = await getNamedAccounts()

  const poolProxy = await deployments.get('VPool')
  console.log(poolProxy.address)
  await deploy(CompoundLeverageStrategyUNI, {
    from: deployer,
    log: true,
    args: [poolProxy.address, Address.SWAP_MANAGER],
  })
  deployFunction.id = 'VUNI-Leverage-1'
  return true
}
module.exports = deployFunction
module.exports.tags = ['VUNI-Leverage-1']
