'use strict'

const {ethers} = require('hardhat')

const PoolConfig = require('../../helper/ethereum/poolConfig')
const {deployContract, getUsers, setupVPool} = require('../utils/setupHelper')
const StrategyType = require('../utils/strategyTypes')

const ONE_MILLION = ethers.utils.parseEther('1000000')

function prepareConfig(_strategies) {
  const interestFee = '1500' // 15%
  const strategies = _strategies || [
    {
      name: 'CompoundVFRStrategyDAI',
      type: StrategyType.COMPOUND,
      config: {interestFee, debtRatio: 1000, debtRate: ONE_MILLION},
    },
  ]
  beforeEach(async function () {
    const users = await getUsers()
    this.users = users
    await setupVPool(this, {
      poolConfig: PoolConfig.VFRDAI,
      feeCollector: users[7].address,
      strategies: strategies.map((item, i) => ({
        ...item,
        feeCollector: users[i + 8].address, // leave first 8 users for other testing
      })),
    })
    const buffer = await deployContract('VFRBuffer', [this.pool.address])
    this.buffer = buffer
    for (const strategy of this.strategies) {
      await strategy.instance.setBuffer(buffer.address)
    }
  })
  return strategies
}

module.exports = {prepareConfig}
