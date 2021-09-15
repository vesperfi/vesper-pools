'use strict'
const {shouldDoSanityTest} = require('../behavior/sanity-test')
const {getUsers} = require('../utils/setupHelper')
const contracts = require('../../releases/3.0.7/contracts.json').networks.mainnet
const {BigNumber: BN} = require('ethers')
const DECIMAL18 = BN.from('1000000000000000000')
const ONE_MILLION = DECIMAL18.mul('1000000')
const {timeTravel} = require('../utils/poolOps')
const {ethers} = require('hardhat')
const poolConfig = require('../../helper/ethereum/poolConfig').VADAI
describe('VADAI Pool', function () {
  const interestFee = '1500' // 15%
  const feeCollector = '0xadb5ef0ca9029b340bccdef005aef442c7f91c96'

  beforeEach(async function () {
    const poolName = poolConfig.poolParams[1].toLowerCase()
    this.pool = await ethers.getContractAt(poolConfig.contractName, contracts[poolName].pool.proxy)
    this.poolAccountant = await ethers.getContractAt('PoolAccountant', contracts[poolName].pool.poolAccountant.proxy)
    const _strategies = await this.poolAccountant.getStrategies()
    this.strategies = []
    for (const _strategy of _strategies) {
      const instance = await ethers.getContractAt('IStrategy', _strategy)
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
  timeTravel(3600)
  shouldDoSanityTest('vDAI', 'DAI')
})
