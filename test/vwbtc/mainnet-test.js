'use strict'
const {getUsers} = require('../utils/setupHelper')
const {unlock} = require('../utils/setupHelper')
const contracts = require('../../releases/3.0.16/contracts.json').networks.mainnet
const {ethers} = require('hardhat')
const poolConfig = require('../../helper/ethereum/poolConfig').VAWBTC

describe('vAWBTC Pool', function () {
  let governor, pool
  const depositor = {address: '0x2ccde611a35aa395c8aeb2babb4e25c835ca1760'}
  const keeper = {address: '0xdf826ff6518e609E4cEE86299d40611C148099d5'}
  beforeEach(async function () {
    keeper.signer = await unlock(keeper.address)
    depositor.signer = await unlock(depositor.address)

    const poolName = poolConfig.poolParams[1].toLowerCase()
    pool = await ethers.getContractAt(poolConfig.contractName, contracts[poolName].pool.proxy)
    const _a = await pool.governor()
    governor = {address: _a}
    governor.signer = await unlock(_a)
    const _strategies = Object.keys(contracts[poolName].strategies)
    this.strategies = []
    for (const _strategy of _strategies) {
      const _strategyAddress = contracts[poolName].strategies[_strategy]
      const instance = await ethers.getContractAt(_strategy, _strategyAddress)
      this.strategies.push(instance)
    }
    const users = await getUsers()
    this.users = users
    const collateralTokenAddress = await pool.token()
    this.collateralToken = await ethers.getContractAt('TokenLikeTest', collateralTokenAddress)
  })

  it('Should do rebalance', async function () {
    const strategy = this.strategies[this.strategies.length - 1]
    await strategy.connect(keeper.signer).rebalance()
  })
})
