'use strict'

const VADAI = require('../../helper/ethereum/poolConfig').VADAI
const PoolAccountant = 'PoolAccountant'

const deployFunction = async function ({getNamedAccounts, deployments}) {
  const {deploy, read} = deployments
  const {deployer} = await getNamedAccounts()

  // Deploy PoolAccountant. This call will deploy ProxyAdmin, proxy and PoolAccountant
  await deploy(PoolAccountant, {
    from: deployer,
    log: true,
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
    },
  })

  // Prepare id of deployment, next deployment will be triggered if id is changed
  const poolVersion = await read(VADAI.contractName, {}, 'VERSION')
  const poolAccountantVersion = await read(PoolAccountant, {}, 'VERSION')
  deployFunction.id = `${VADAI.poolParams[1]}-v${poolVersion}_${poolAccountantVersion}`
  return true
}
module.exports = deployFunction
module.exports.tags = ['VADAI-UPGRADE-3.0.6']
