'use strict'

const BuyBack = 'BuyBack'

const deployFunction = async function ({ getNamedAccounts, deployments, network }) {
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  const hreNetwork = network.name
  const helperNetwork = hreNetwork === 'localhost' || hreNetwork === 'hardhat' ? 'mainnet' : hreNetwork
  const Address = require(`../../helper/${helperNetwork}/address`)

  await deploy(BuyBack, {
    from: deployer,
    log: true,
    args: [Address.GOVERNOR, Address.NATIVE_TOKEN, Address.vVSP, Address.ADDRESS_LIST_FACTORY, Address.SWAP_MANAGER],
  })
}
module.exports = deployFunction
module.exports.tags = [BuyBack]
