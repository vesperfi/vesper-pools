'use strict'

const BuyBack = 'BuyBack'

const deployFunction = async function ({ getNamedAccounts, deployments, targetChain }) {
  const Address = require(`../helper/${targetChain}/address`)

  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  await deploy(BuyBack, {
    from: deployer,
    log: true,
    args: [
      '0xdf826ff6518e609E4cEE86299d40611C148099d5',
      Address.NATIVE_TOKEN,
      Address.Vesper.vVSP,
      Address.Vesper.ADDRESS_LIST_FACTORY,
      Address.Vesper.SWAP_MANAGER,
    ],
  })
}
module.exports = deployFunction
module.exports.tags = [BuyBack]
