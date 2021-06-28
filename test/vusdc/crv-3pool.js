'use strict'

const {ethers} = require('hardhat')

const {shouldBehaveLikePool} = require('../behavior/vesper-pool')
const {shouldBehaveLikeStrategy} = require('../behavior/strategy')
const {timeTravel, reset} = require('../utils/poolOps')
const StrategyType = require('../utils/strategyTypes')
const {setupVPool, getUsers} = require('../utils/setupHelper')
const PoolConfig = require('../../helper/ethereum/poolConfig')

const ONE_MILLION = ethers.utils.parseEther('1000000')

describe('vUSDC Pool with Crv3PoolStrategy', function () {
  let feeAcct, swapManager

  before(async function () {
    const users = await getUsers()
    this.users = users
    feeAcct = users[9]
  })

  beforeEach(async function () {
    const interestFee = '1500' // 15%
    const strategyConfig = {interestFee, debtRatio: 10000, debtRate: ONE_MILLION}

    await setupVPool(this, {
      poolConfig: PoolConfig.VUSDC,
      feeCollector: feeAcct.address,
      strategies: [
        {name: 'Crv3PoolStrategyUSDC', type: StrategyType.CURVE, config: strategyConfig, feeCollector: feeAcct.address},
      ],
    })

    swapManager = this.swapManager

    timeTravel(3600)
    await swapManager['updateOracles()']()
  })

  describe('Pool Tests', function () {
    shouldBehaveLikePool('vUSDC', 'USDC')
  })

  describe('Strategy Tests', function () {
    after(reset)
    shouldBehaveLikeStrategy(0, StrategyType.CURVE, 'Crv3PoolStrategyUSDC')
  })
})
