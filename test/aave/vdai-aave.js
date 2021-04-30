'use strict'

const {shouldBehaveLikePool} = require('../behavior/vesper-pool')
const {shouldBehaveLikeMultiPool} = require('../behavior/vesper-multi-pool')
// const {shouldBehaveLikeStrategy} = require('../behavior/aave-strategy')
const {setupVPool} = require('../utils/setupHelper')
const StrategyType = require('../utils/strategyTypes')

const VDAI = artifacts.require('VDAI')
const AaveStrategy = artifacts.require('AaveV2StrategyDAI')
const CompoundStrategy = artifacts.require('CompoundStrategyDAI')
const {constants} = require('@openzeppelin/test-helpers')

contract('vDAI Pool with AaveStrategy', function (accounts) {
  const interestFee = '1500' // 15%
  const feeCollector = accounts[9]
  const config1 = {interestFee, debtRatio: 9000, maxDebtPerRebalance: constants.MAX_UINT256}
  const config2 = {interestFee, debtRatio: 0, maxDebtPerRebalance: constants.MAX_UINT256}

  beforeEach(async function () {
    this.accounts = accounts
    await setupVPool(this, {
      pool: VDAI,
      feeCollector,
      strategies: [
        {artifact: AaveStrategy, type: StrategyType.AAAVE, config: config1, feeCollector: accounts[9]},
        {artifact: CompoundStrategy, type: StrategyType.COMPOUND, config: config2, feeCollector: accounts[8]},
      ],
    })
  })

  shouldBehaveLikePool('vDai', 'DAI')
  shouldBehaveLikeMultiPool('vDai')
  // shouldBehaveLikeStrategy('vDai', 'DAI', StrategyType.AAAVE)
})
