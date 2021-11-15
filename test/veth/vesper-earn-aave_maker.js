'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikeStrategy } = require('../behavior/strategy')
const StrategyType = require('../utils/strategyTypes')
const { ethers } = require('hardhat')
describe('vETH pool strategies', function () {
  beforeEach(async function () {
    const interestFee = '1500' // 15%
    const ONE_MILLION = ethers.utils.parseEther('1000000')
    const strategies = [
      {
        name: 'EarnAaveMakerStrategyETH',
        type: StrategyType.EARN_MAKER,
        config: { interestFee, debtRatio: 9000, debtRate: ONE_MILLION },
      },
    ]
    prepareConfig(strategies)
  })
  const interestFee = '1500' // 15%
  const ONE_MILLION = ethers.utils.parseEther('1000000')
  const strategies = [
    {
      name: 'EarnAaveMakerStrategyETH',
      type: StrategyType.EARN_MAKER,
      config: { interestFee, debtRatio: 9000, debtRate: ONE_MILLION },
    },
  ]
  prepareConfig(strategies)
  // const vesperEarnDripImpl = await deployContract('VesperEarnDrip', [pool.address, Address.DAI])
  // await pool.updatePoolRewards(proxy.address)
  for (let i = 0; i < strategies.length; i++) {
    shouldBehaveLikeStrategy(i, strategies[i].type, strategies[i].name)
  }
})
