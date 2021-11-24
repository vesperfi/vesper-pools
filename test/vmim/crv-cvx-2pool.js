'use strict'

/* eslint-disable no-console */
const { ethers } = require('hardhat')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { shouldBehaveLikeStrategy } = require('../behavior/strategy')
const { reset } = require('../utils/poolOps')
const StrategyType = require('../utils/strategyTypes')
const PoolConfig = require('../../helper/mainnet/poolConfig')
const { setupVPool, getUsers } = require('../utils/setupHelper')

const ONE_MILLION = ethers.utils.parseEther('1000000')

describe('vMIM Pool with Convex2PoolStrategy', function () {
  let feeAcct

  before(async function () {
    const users = await getUsers()
    this.users = users
    feeAcct = users[9]
  })

  beforeEach(async function () {
    const interestFee = '1500' // 15%
    const strategyConfig = { interestFee, debtRatio: 10000, debtRate: ONE_MILLION }

    await setupVPool(this, {
      poolConfig: PoolConfig.VMIM,
      feeCollector: feeAcct.address,
      strategies: [
        {
          name: 'Convex2PoolStrategyMIMUSTPoolMIM',
          type: StrategyType.CURVE,
          config: strategyConfig,
          feeCollector: feeAcct.address,
        },
      ],
    })
  })

  describe('Pool Tests', function () {
    shouldBehaveLikePool('vMIM', 'MIM')
  })

  describe('Strategy Tests', function () {
    after(reset)
    shouldBehaveLikeStrategy(0, StrategyType.CURVE, 'Convex2PoolStrategyMIMUSTPoolMIM')
  })
})
