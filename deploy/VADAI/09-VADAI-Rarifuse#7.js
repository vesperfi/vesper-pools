'use strict'

const Address = require('../../helper/ethereum/address')
const RariFuseStrategy = 'RariFuseStrategy'
const RARI_FUSE_POOL_ID = 7

const deployFunction = async function ({getNamedAccounts, deployments}) {
  const {deploy} = deployments
  const {deployer} = await getNamedAccounts()

  const poolProxy = await deployments.get('VPool')
  await deploy(RariFuseStrategy, {
    from: deployer,
    log: true,
    args: [poolProxy.address, Address.SWAP_MANAGER, RARI_FUSE_POOL_ID],
  })
  deployFunction.id = 'VADAI-RARI#7'
  return true
}
module.exports = deployFunction
module.exports.tags = ['VADAI-RARI#7']
