'use strict'
const { unlock } = require('./utils/setupHelper')
const { expect } = require('chai')
const { ethers } = require('hardhat')
const { BigNumber } = require('ethers')
const { deposit } = require('./utils/poolOps')

function sanityTestOfPool(poolAddress) {
  let pool
  let collateralToken
  let users
  const strategies = []

  beforeEach(async function () {
    pool = await ethers.getContractAt('VPool', poolAddress)
    const _strategies = await pool.getStrategies()
    for (const _strategy of _strategies) {
      const instance = await ethers.getContractAt('Strategy', _strategy)
      strategies.push(instance)
    }
    users = await ethers.getSigners()
    const collateralTokenAddress = await pool.token()
    collateralToken = await ethers.getContractAt('TokenLikeTest', collateralTokenAddress)
  })

  it('Should deposit => rebalance => withdraw', async function () {
    let strategy
    for (const s of strategies) {
      const strategyConfig = await pool.strategy(s.address)
      if (strategyConfig._debtRatio.gt(BigNumber.from(0))) {
        strategy = s
        break
      }
    }
    const keeperList = await ethers.getContractAt('IAddressList', await strategy.keepers())
    const keeper = await unlock((await keeperList.at(0))[0])
    await strategy.connect(keeper).rebalance()
    await deposit(pool, collateralToken, 100, users[0])
    let balance = await pool.balanceOf(users[0].address)
    expect(balance).to.be.gt(0, 'Pool balance of user is wrong')
    const tokenHereBefore = await pool.tokensHere()
    await strategy.connect(keeper).rebalance()
    const tokensHereAfter = await pool.tokensHere()
    expect(tokenHereBefore).to.be.gt(tokensHereAfter, 'Rebalance ')
    await pool.connect(users[0]).withdraw(balance)
    balance = await pool.balanceOf(users[0].address)
    expect(balance).to.be.eq(0, 'Pool balance of user is wrong')
  })
}

// Commented test for CI build
xdescribe('Mainnet new pool sanity test', function () {
  const vaFEI = '0x2B6c40Ef15Db0D78D08A7D1b4E12d57E88a3e324'
  sanityTestOfPool(vaFEI)
  const vaDAI = '0x0538C8bAc84E95A9dF8aC10Aad17DbE81b9E36ee'
  sanityTestOfPool(vaDAI)
})
