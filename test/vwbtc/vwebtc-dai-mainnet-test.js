'use strict'
const { getUsers } = require('../utils/setupHelper')
const { deposit } = require('../utils/poolOps')
const { expect } = require('chai')
const { unlock } = require('../utils/setupHelper')
const Address = require('../../helper/mainnet/address')
const { ethers } = require('hardhat')
const { timeTravel } = require('../utils/poolOps')

async function rebalance(strategies, maxIteration = 2) {
  let i = 0
  const iteration = strategies.length < maxIteration ? strategies.length : maxIteration
  while (i < iteration) {
    const strategy = await ethers.getContractAt('IStrategy', strategies[i])
    const keeperList = await ethers.getContractAt('IAddressList', await strategy.keepers())
    const signer = await unlock((await keeperList.at(0))[0])
    await strategy.connect(signer).rebalance()
    i++
  }
}

describe('veWBTC-DAI Pool', function () {
  let vaDai, pool, vaDaiKeeper, veWbtcKeeper, collateralToken, user1, DAI
  const veWTBCDai = '0x7a74B6D3A07D3249Ea2FBb58e47F0DaF6d6a2ebf'
  beforeEach(async function () {
    vaDai = await ethers.getContractAt('VPool', Address.vaDAI)
    pool = await ethers.getContractAt('VPool', veWTBCDai)
    const token = await pool.token()
    collateralToken = await ethers.getContractAt('ERC20', token)
    DAI = await ethers.getContractAt('ERC20', Address.DAI)
    const users = await getUsers()
    ;[, user1] = users
    let keeperList = await ethers.getContractAt('IAddressList', await vaDai.keepers())
    vaDaiKeeper = { address: (await keeperList.at(0))[0] }
    vaDaiKeeper.signer = await unlock(vaDaiKeeper.address)
    keeperList = await ethers.getContractAt('IAddressList', await pool.keepers())
    veWbtcKeeper = { address: (await keeperList.at(0))[0] }
    veWbtcKeeper.signer = await unlock(vaDaiKeeper.address)
  })

  it('Verify deposit, withdraw, rebalance', async function () {
    await deposit(pool, collateralToken, 20, user1)
    const totalValueBefore = await pool.totalValue()
    expect(totalValueBefore).to.be.gt(0, 'total value wrong')
    const veWbtcStrategies = await pool.getStrategies()
    const vaDaiStrategies = await vaDai.getStrategies()
    await rebalance(veWbtcStrategies)
    let vaDaiBalance = await vaDai.balanceOf(veWbtcStrategies[0])
    expect(vaDaiBalance).to.be.gt(0, 'vaDai balance of strategy is wrong')
    await rebalance(vaDaiStrategies)
    await timeTravel(2 * 24 * 60 * 60)
    await rebalance(vaDaiStrategies)
    await rebalance(veWbtcStrategies)
    const dripContract = await pool.poolRewards()
    vaDaiBalance = await vaDai.balanceOf(dripContract)
    expect(vaDaiBalance).to.be.gt(0, 'vaDai balance of dripContract is wrong')
    const balance = await pool.balanceOf(user1.address)
    const balanceBefore = await collateralToken.balanceOf(user1.address)
    const daiBalanceBefore = await DAI.balanceOf(user1.address)
    await pool.connect(user1.signer).withdraw(balance)
    const balanceAfter = await collateralToken.balanceOf(user1.address)
    const daiBalanceAfter = await DAI.balanceOf(user1.address)
    expect(balanceAfter).to.be.gt(balanceBefore, 'withdraw failed')
    expect(daiBalanceAfter).to.be.gt(daiBalanceBefore, 'dai balance is wrong')
  })
})
