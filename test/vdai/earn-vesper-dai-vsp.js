'use strict'

const { ethers } = require('hardhat')
const { prepareConfig } = require('./config')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { shouldBehaveLikeStrategy } = require('../behavior/strategy')
const StrategyType = require('../utils/strategyTypes')
const Address = require('../../helper/mainnet/address')
const { setupEarnDrip, addInFeeWhitelist } = require('../utils/setupHelper')

describe('veDAI Pool', function () {
  const interestFee = '1500' // 15%
  const strategies = [
    {
      name: 'EarnVesperStrategyDAIVSP',
      type: StrategyType.EARN_VESPER,
      config: { interestFee, debtRatio: 9000, debtRate: ethers.utils.parseEther('1000000') },
    },
  ]
  prepareConfig(strategies)
  setupEarnDrip(Address.vVSP)
  addInFeeWhitelist('0x0538C8bAc84E95A9dF8aC10Aad17DbE81b9E36ee')

  describe('Pool Tests', function () {
    shouldBehaveLikePool('veDai', 'DAI', true)
  })

  for (let i = 0; i < strategies.length; i++) {
    shouldBehaveLikeStrategy(i, strategies[i].type, strategies[i].name)
  }
})
