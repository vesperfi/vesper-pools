'use strict'

const {shouldBehaveLikePool} = require('../behavior/vesper-pool')
// const {shouldBehaveLikeStrategy} = require('../behavior/aave-strategy')
const {setupVPool} = require('../utils/setupHelper')
const StrategyType = require('../utils/strategyTypes')

const VDAI = artifacts.require('VDAI')
const AaveStrategy = artifacts.require('AaveV2StrategyDAI')
const {BN} = require('@openzeppelin/test-helpers')
const DECIMAL18 = new BN('1000000000000000000')
const INFINITE = DECIMAL18.mul(new BN('10000000000000000000000000'))

contract('vDAI Pool with AaveStrategy', function (accounts) {
  const interestFee = '1500' // 15%
  const feeCollector = accounts[9]
  const strategyConfig = {interestFee, debtRatio: 9000, debtRatePerBlock: INFINITE, maxDebtPerRebalance: INFINITE}

  beforeEach(async function () {
    this.accounts = accounts
    await setupVPool(this, {
      pool: VDAI,
      feeCollector,
      strategies: [{artifact: AaveStrategy, type: StrategyType.AAAVE, config: strategyConfig, feeCollector}],
    })

    // this.newStrategy = AaveStrategy
  })

  shouldBehaveLikePool('vDai', 'DAI')
  // shouldBehaveLikeStrategy('vDai', 'DAI', StrategyType.AAAVE)
})