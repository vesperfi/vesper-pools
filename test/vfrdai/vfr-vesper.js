'use strict'

const hre = require('hardhat')
const ethers = hre.ethers
const { parseEther } = ethers.utils
const StrategyType = require('../utils/strategyTypes')

const { prepareConfig } = require('../utils/vfr-common')
const { shouldBehaveLikeVFRPool } = require('../behavior/vfr-pool')

const ONE_MILLION = parseEther('1000000')

describe('VFR DAI Vesper', function () {

  const stableStrategyConfigs = [
    {
      name: 'VesperStableStrategyDAI',
      type: StrategyType.EARN_VESPER,
      config: { interestFee: 1500, debtRatio: 5000, debtRate: ONE_MILLION },
    },
    {
      name: 'VesperStableStrategyDAI',
      type: StrategyType.EARN_VESPER,
      config: { interestFee: 1500, debtRatio: 5000, debtRate: ONE_MILLION },
    }
  ]

  const coverageStrategyConfigs = [
    {
      name: 'VesperCoverageStrategyDAI',
      type: StrategyType.EARN_VESPER,
      config: { interestFee: 1500, debtRatio: 5000, debtRate: ONE_MILLION },
    }
  ]

  before(async function () {
    await prepareConfig(stableStrategyConfigs, coverageStrategyConfigs)
  })

  shouldBehaveLikeVFRPool()
})
