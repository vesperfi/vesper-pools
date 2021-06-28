'use strict'

const vsp = '0x1b40183EFB4Dd766f11bDa7A7c3AD8982e998421'
const vuni = '0x7E198A1934FffFf394E942D5BDc44C43dD5C5DD7'
const deployFunction = async function ({getNamedAccounts, deployments}) {
  const {deploy} = deployments
  const {deployer} = await getNamedAccounts()
  // const VUNI = await ethers.getContractAt('OpenZeppelinTransparentProxy', 
  // '0x7E198A1934FffFf394E942D5BDc44C43dD5C5DD7')
  // Deploy Pool. This call will use ProxyAdmin. It will deploy proxy and Pool and also initialize pool
  await deploy('PoolRewards', {
    from: deployer,
    log: true,
    // proxy deployment
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
      viaAdminContract: 'DefaultProxyAdmin',
      execute: {
        init: {
          methodName: 'initialize',
          args: [vuni, vsp],
        },
      },
    },
  })
  // TODO: fix this
  // const pool = await ethers.getContractAt('VPool', vuni)
  // await pool.updatePoolRewards(rewardProxy.address)
  // await execute(pool, {from: deployer, log: true}, 'updatePoolRewards', rewardProxy.address)
}
module.exports = deployFunction
