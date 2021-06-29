'use strict'
const {shouldDoSanityTest} = require('../behavior/sanity-test')
const {getUsers} = require('../utils/setupHelper')
const contracts = require('../../releases/3.0.4/contracts.json').networks.mainnet
const StrategyType = require('../utils/strategyTypes')
const {BigNumber: BN} = require('ethers')
const DECIMAL18 = BN.from('1000000000000000000')
const ONE_MILLION = DECIMAL18.mul('1000000')
const {ethers} = require('hardhat')
const poolConfig = require('../../helper/ethereum/poolConfig').VUSDT
describe('vUSDT Pool', function () {
  const interestFee = '1500' // 15%
  const feeCollector = '0x223809E09ec28C28219769C3FF05c790c213152C'

  beforeEach(async function () {
    const poolName = poolConfig.poolParams[1].toUpperCase()
    this.pool = await ethers.getContractAt(poolConfig.contractName, contracts[poolName].pool.proxy)
    const _strategies = contracts[poolName].strategies
    
    for (const _strategy of _strategies) {
      const strategyName = Object.keys(_strategy)[0]
      const strategyAddress = Object.values(_strategy)[0]
      const instance = await ethers.getContractAt(strategyName, strategyAddress)
      this.strategies = []
      const strat = {
        instance,
        feeCollector,
        name: strategyName,
        type: StrategyType.COMPOUND,
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

  shouldDoSanityTest('vUSDT', 'USDT')
})
