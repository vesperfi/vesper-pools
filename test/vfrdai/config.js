'use strict'

const {ethers} = require('hardhat')

const PoolConfig = require('../../helper/ethereum/poolConfig')
const {deployContract, getUsers, setupVPool} = require('../utils/setupHelper')
const StrategyType = require('../utils/strategyTypes')

const ONE_MILLION = ethers.utils.parseEther('1000000')

function prepareConfig(_stableStrategies, _coverageStrategies) {
  const interestFee = '1500' // 15%

  const stableStrategies = _stableStrategies || [
    {
      name: 'CompoundStableStrategyDAI',
      type: StrategyType.COMPOUND,
      config: {interestFee, debtRatio: 5000, debtRate: ONE_MILLION},
    },
    {
      name: 'CompoundStableStrategyDAI',
      type: StrategyType.COMPOUND,
      config: {interestFee, debtRatio: 5000, debtRate: ONE_MILLION},
    },
  ]

  const coverageStrategies = _coverageStrategies || [
    {
      name: 'CompoundCoverageStrategyDAI',
      type: StrategyType.COMPOUND,
      config: {interestFee, debtRatio: 5000, debtRate: ONE_MILLION},
    },
    {
      name: 'CompoundCoverageStrategyDAI',
      type: StrategyType.COMPOUND,
      config: {interestFee, debtRatio: 5000, debtRate: ONE_MILLION},
    },
  ]

  beforeEach(async function () {
    const users = await getUsers()
    this.users = users

    this.stable = {}
    await setupVPool(this.stable, {
      poolConfig: PoolConfig.VFRStableDAI,
      feeCollector: users[7].address,
      strategies: stableStrategies.map((item, i) => ({
        ...item,
        // Leave first 8 users for other testing
        feeCollector: users[i + 8].address,
      })),
    })

    this.coverage = {}
    await setupVPool(this.coverage, {
      poolConfig: PoolConfig.VFRCoverageDAI,
      feeCollector: users[7].address,
      strategies: coverageStrategies.map((item, i) => ({
        ...item,
        // Leave first 8 users for other testing
        feeCollector: users[i + 8].address,
      })),
    })

    const buffer = await deployContract('VFRBuffer', [
      this.stable.pool.address,
      this.coverage.pool.address,
      24 * 3600
    ])
    this.buffer = buffer
    this.stable.pool.setBuffer(buffer.address)
    this.coverage.pool.setBuffer(buffer.address)
  })
}

module.exports = {prepareConfig}
