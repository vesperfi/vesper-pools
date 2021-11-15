'use strict'

const { ethers } = require('hardhat')
const { prepareConfig } = require('./config')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { shouldBehaveLikeStrategy } = require('../behavior/strategy')
const StrategyType = require('../utils/strategyTypes')

describe('vDAI Pool', function () {
  const interestFee = '1500' // 15%
  const strategies = [
    {
      name: 'AlphaLendStrategyDAI',
      type: StrategyType.ALPHA_LEND,
      config: { interestFee, debtRatio: 9000, debtRate: ethers.utils.parseEther('1000000') },
    },
  ]

  prepareConfig(strategies)
  shouldBehaveLikePool('vDai', 'DAI')
  shouldBehaveLikeStrategy(0, strategies[0].type, strategies[0].name)
})
