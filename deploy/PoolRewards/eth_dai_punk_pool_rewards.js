'use strict'

const deployFunction = async function ({ getNamedAccounts, deployments }) {
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()
  const veDAIPUNK = '0xeBcF77CCE55ed6091F82aEE3c5539841E4D75F49'
  const Address = require('../../helper/mainnet/address')
  const rewardTokens = [Address.PUNK, Address.VSP]
  // Deploy pool rewards
  await deploy('VesperEarnDrip', {
    from: deployer,
    log: true,
    // proxy deployment
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
      viaAdminContract: 'DefaultProxyAdmin',
      execute: {
        init: {
          methodName: 'initialize',
          args: [veDAIPUNK, rewardTokens],
        },
      },
    },
  })

  deployFunction.id = 'veDAIPUNK-poolRewards-v2'

  return true
}
module.exports = deployFunction
module.exports.tags = ['deploy-veDAIPUNK-rewards']
