'use strict'

const hre = require('hardhat')
const ethers = hre.ethers
const { parseEther } = ethers.utils
const StrategyType = require('../utils/strategyTypes')

const { prepareConfig } = require('../utils/vfr-common')
const { shouldBehaveLikeVFRPool } = require('../behavior/vfr-pool')
const { smock } = require('@defi-wonderland/smock')
const address = require('../../helper/ethereum/address')

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
    const vaDAI = await ethers.getContractAt('VPool', address.vaDAI)
    const mock = await smock.fake('IAddressList', { address: await vaDAI.feeWhitelist() })
    // Pretend stable and coverage strategies are whitelisted for withdraw without fee
    mock.contains.returns(true)
    await prepareConfig(stableStrategyConfigs, coverageStrategyConfigs)
  })

  shouldBehaveLikeVFRPool()
})
