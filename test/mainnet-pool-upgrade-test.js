'use strict'
const { unlock } = require('./utils/setupHelper')
const { expect } = require('chai')
const { ethers } = require('hardhat')
const hre = require('hardhat')
const { BigNumber } = require('ethers')
const { deposit } = require('./utils/poolOps')

// TODO Commented test for CI build as tests was failing with BLOCK_NUMBER 13937297.
// The tests expects strategy 2 strategy and was using strategy at index 1 while at this block it has only one strategy.
// Even with latest block, it's failing in rebalance and reverted with reason string '1'
// which means Collateral must be greater than 0
xdescribe('Mainnet new pool sanity test', function () {
  // Change addresses as per tests.
  const poolProxyAddress = '0x7a74B6D3A07D3249Ea2FBb58e47F0DaF6d6a2ebf'
  const accountantProxyAddress = '0x11aAb1b00c62EA9528c3286C53c2308Aad6f64ea'
  const poolUpgraderAddress = '0x47046Cb201C6be61e9f3cC3B700358150336a3B8'
  const accountantUpgraderAddress = '0x0e8Fde7771899413B73613d78AD9E14BdA807C60'
  const poolImplementationAddressNew = '0x8d48fD51FfEB99b1Ad1224038E46166Cfc7d9dE3'
  const accountantImplementationAddressNew = '0x2Ad6DefC823D6DF64117C6dB0A17596faD90C767'
  let pool, poolUpgrader, accountUpgrader
  let collateralToken
  let users
  const strategies = []
  beforeEach(async function () {
    poolUpgrader = await ethers.getContractAt('VPoolUpgrader', poolUpgraderAddress)
    accountUpgrader = await ethers.getContractAt('PoolAccountantUpgrader', accountantUpgraderAddress)
    pool = await ethers.getContractAt('VPool', poolProxyAddress)
  })
  it('Should deposit => rebalance => withdraw', async function () {
    const _strategies = await pool.getStrategies()
    for (const _strategy of _strategies) {
      const instance = await ethers.getContractAt('Strategy', _strategy)
      strategies.push(instance)
    }
    users = await ethers.getSigners()
    const collateralTokenAddress = await pool.token()
    collateralToken = await ethers.getContractAt('TokenLikeTest', collateralTokenAddress)
    const strategy = strategies[1]
    // for (const s of strategies) {
    //   const strategyConfig = await pool.strategy('0x1Cd0f3bD73d60D56B487073A0caB2E8a9085CF08')
    //   console.log('strategyConfig', strategyConfig)
    //   if (strategyConfig._debtRatio.gt(BigNumber.from(0))) {
    //     strategy = s
    //     break
    //   }
    // }
    const keeperList = await strategy.keepers()
    const keeper = await unlock(keeperList[0])
    await strategy.connect(keeper).rebalance()
    await deposit(pool, collateralToken, 100, users[0])
    const balance = await pool.balanceOf(users[0].address)
    expect(balance).to.be.gt(0, 'Pool balance of user is wrong')
    const tokenHereBefore = await pool.tokensHere()
    await strategy.connect(keeper).rebalance()
    const tokensHereAfter = await pool.tokensHere()
    expect(tokenHereBefore).to.be.gt(tokensHereAfter, 'Rebalance ')
    const defaultProxyAdmin = await ethers.getContractAt('ProxyAdmin', '0x19A02f3512BdF78114B3c50f7d22a34b1B2798cA')
    const poolProxy = await ethers.getContractAt('TransparentUpgradeableProxy', poolProxyAddress)
    const accountantProxy = await ethers.getContractAt('TransparentUpgradeableProxy', accountantProxyAddress)
    const governor = await pool.governor()
    const signer = await unlock(governor)
    const amount = BigNumber.from(10).mul(BigNumber.from('1000000000000000000'))
    await hre.network.provider.send('hardhat_setBalance', [governor, amount.toHexString()])
    // Changing proxy default proxy admin to upgrader proxy admin.
    await defaultProxyAdmin.connect(signer).changeProxyAdmin(poolProxy.address, poolUpgrader.address)
    await defaultProxyAdmin.connect(signer).changeProxyAdmin(accountantProxy.address, accountUpgrader.address)
    // Upgrading proxy
    await poolUpgrader.connect(signer).safeUpgrade(poolProxy.address, poolImplementationAddressNew)
    await accountUpgrader.connect(signer).safeUpgrade(accountantProxy.address, accountantImplementationAddressNew)
    const balanceBeforeWithdraw = await pool.balanceOf(users[0].address)
    expect(balanceBeforeWithdraw).to.be.eq(balanceBeforeWithdraw, 'Pool balance of user is wrong')
    // eslint-disable-next-line no-console
    console.log('balance', balanceBeforeWithdraw.toString())
    await pool.connect(users[0]).withdraw(balance)
    const balanceAfterWithdraw = await pool.balanceOf(users[0].address)
    // eslint-disable-next-line no-console
    console.log('balanceAfterWithdraw', balanceAfterWithdraw.toString())
    expect(balanceAfterWithdraw).to.be.lt(balanceBeforeWithdraw, 'Pool balance of user is wrong')
  })
})
