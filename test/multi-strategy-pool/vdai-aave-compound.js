'use strict'

const {shouldBehaveLikePool} = require('../behavior/vesper-pool')
const {shouldBehaveLikeMultiPool} = require('../behavior/vesper-multi-pool')
const {setupVPool} = require('../utils/setupHelper')
const StrategyType = require('../utils/strategyTypes')

const VDAI = artifacts.require('VDAI')
const AaveStrategy = artifacts.require('AaveV2StrategyDAI')
const CompoundStrategy = artifacts.require('CompoundStrategyDAI')
const {BigNumber: BN} = require('ethers')
const DECIMAL18 = BN.from('1000000000000000000')
const ONE_MILLION = DECIMAL18.mul('1000000')

contract('vDAI Pool with multiple strategy', function (accounts) {
  const interestFee = '1500' // 15%
  const feeCollector = accounts[9]
  const config1 = {interestFee, debtRatio: 9000, debtRate: ONE_MILLION}
  const config2 = {interestFee, debtRatio: 0, debtRate: ONE_MILLION}

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
})
