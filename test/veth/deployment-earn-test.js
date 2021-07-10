'use strict'
const {shouldDoSanityEarnTest} = require('../behavior/sanity-earn-test')
const {getUsers} = require('../utils/setupHelper')
const contracts = require('../../releases/3.0.5/contracts.json').networks.mainnet
const {BigNumber: BN} = require('ethers')
const DECIMAL18 = BN.from('1000000000000000000')
const ONE_MILLION = DECIMAL18.mul('1000000')
const {ethers} = require('hardhat')
const poolConfig = require('../../helper/ethereum/poolConfig').VETHEarn
describe('veETH-DAI Pool', function () {
  const interestFee = '1500' // 15%
  const feeCollector = '0x223809E09ec28C28219769C3FF05c790c213152C'

  beforeEach(async function () {
    const poolName = poolConfig.poolParams[1].toLowerCase()
    this.pool = await ethers.getContractAt(poolConfig.contractName, contracts[poolName].pool.proxy)
    const _strategies = Object.keys(contracts[poolName].strategies)
    this.strategies = []
    for (const _strategy of _strategies) {
      const address = contracts[poolName].strategies[_strategy]
      const instance = await ethers.getContractAt(_strategy, address)
      const strat = {
        instance,
        feeCollector,
        name: _strategy,
        config: {interestFee, debtRatio: 9500, debtRate: ONE_MILLION},
      }
      const strategyTokenAddress = await instance.token()
      strat.token = await ethers.getContractAt('CToken', strategyTokenAddress)
      this.strategies.push(strat)
    }

    const users = await getUsers()
    this.users = users
    this.feeCollector = feeCollector
    const collateralTokenAddress = await this.pool.token()
    this.collateralToken = await ethers.getContractAt('TokenLikeTest', collateralTokenAddress)
  })

  shouldDoSanityEarnTest('veETH-DAI', 'WETH')
})
