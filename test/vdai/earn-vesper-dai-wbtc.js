'use strict'

const { ethers } = require('hardhat')
const { prepareConfig } = require('./config')
const { shouldBehaveLikeStrategy } = require('../behavior/strategy')
const StrategyType = require('../utils/strategyTypes')
const Address = require('../../helper/ethereum/address')
const {setupEarnDrip} = require('../utils/setupHelper')

describe('veDAI Pool', function () {
  const interestFee = '1500' // 15%
  const strategies = [
    {
      name: 'EarnVesperStrategyDAIWBTC',
      type: StrategyType.EARN_VESPER,
      config: { interestFee, debtRatio: 9000, debtRate: ethers.utils.parseEther('1000000') },
    },
  ]
  prepareConfig(strategies)
  setupEarnDrip(Address.vWBTC)
  for (let i = 0; i < strategies.length; i++) {
    shouldBehaveLikeStrategy(i, strategies[i].type, strategies[i].name)
  }
})
