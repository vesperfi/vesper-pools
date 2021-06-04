'use strict'
const {shouldDoSanityTest} = require('../behavior/sanity-test')
const {getUsers} = require('../utils/setupHelper')
const StrategyType = require('../utils/strategyTypes')
const {BigNumber: BN} = require('ethers')
const DECIMAL18 = BN.from('1000000000000000000')
const ONE_MILLION = DECIMAL18.mul('1000000')
const {ethers, deployments} = require('hardhat')
const tag = 'VUSDT-v3.0.3'
const poolName = 'VUSDT'
const strategyName = 'CompoundStrategyUSDT'
// TODO: prepare for multi strategies.
// TODO: add more sanity tests
/* eslint-disable mocha/no-setup-in-describe */
describe('vUSDT Pool', function () {
  const interestFee = '1500' // 15%
  const feeCollector = '0x223809E09ec28C28219769C3FF05c790c213152C'
  beforeEach(async function () {
    await deployments.fixture(tag)
    let deployed = await deployments.get(poolName)
    this.pool = await ethers.getContractAt(poolName, deployed.address)
    deployed = await deployments.get(strategyName)
    const strategyContract = await ethers.getContractAt(strategyName, deployed.address)
    const strategy = {
      instance: strategyContract,
      feeCollector,
      name: strategyName,
      type: StrategyType.COMPOUND,
      config: {interestFee, debtRatio: 9500, debtRate: ONE_MILLION},
    }
    const strategyTokenAddress = await strategy.instance.token()
    strategy.token = await ethers.getContractAt('CToken', strategyTokenAddress)
    const users = await getUsers()
    this.users = users
    this.strategies = [strategy]
    this.feeCollector = feeCollector
    const collateralTokenAddress = await this.pool.token()
    this.collateralToken = await ethers.getContractAt('TokenLikeTest', collateralTokenAddress)
  })

  shouldDoSanityTest('vUSDT', 'USDT')
})
