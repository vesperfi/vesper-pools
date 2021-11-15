'use strict'

const { ethers } = require('hardhat')
const { prepareConfig } = require('./config')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { shouldBehaveLikeStrategy } = require('../behavior/strategy')
const StrategyType = require('../utils/strategyTypes')

describe('vLink Pool', function () {
  const interestFee = '1500' // 15%
  const strategies = [
    {
      name: 'AlphaLendStrategyLINK',
      type: StrategyType.ALPHA_LEND,
      config: { interestFee, debtRatio: 9000, debtRate: ethers.utils.parseEther('1000000') },
    },
  ]

  prepareConfig(strategies)
  shouldBehaveLikePool('vLink', 'LINK')
  shouldBehaveLikeStrategy(0, strategies[0].type, strategies[0].name)
})
