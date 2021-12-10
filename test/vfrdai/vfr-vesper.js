'use strict'

const { ethers } = require('hardhat')
const { prepareConfig } = require('../utils/vfr-common')
const { shouldBehaveLikeVFRPool } = require('../behavior/vfr-pool')
const { smock } = require('@defi-wonderland/smock')

const { address: Address, strategyConfig } = require('../utils/chains').getChainData()

describe('VFR DAI Vesper', function () {
  const stableStrategy1 = strategyConfig.VesperStableStrategyDAI
  stableStrategy1.config.debtRatio = 5000
  const stableStrategy2 = strategyConfig.VesperStableStrategyDAI
  stableStrategy2.config.debtRatio = 5000
  const stableStrategyConfigs = [stableStrategy1, stableStrategy2]

  const coverageStrategy1 = strategyConfig.VesperCoverageStrategyDAI
  coverageStrategy1.config.debtRatio = 5000
  const coverageStrategyConfigs = [coverageStrategy1]

  before(async function () {
    const vaDAI = await ethers.getContractAt('VPool', Address.vaDAI)
    const mock = await smock.fake('IAddressList', { address: await vaDAI.feeWhitelist() })
    // Pretend stable and coverage strategies are whitelisted for withdraw without fee
    mock.contains.returns(true)
    await prepareConfig(stableStrategyConfigs, coverageStrategyConfigs)
  })

  shouldBehaveLikeVFRPool()
})
