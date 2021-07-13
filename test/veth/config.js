'use strict'

const {getUsers, setupVPool} = require('../utils/setupHelper')
const StrategyType = require('../utils/strategyTypes')
const PoolConfig = require('../../helper/ethereum/poolConfig')
const {ethers} = require('hardhat')
const ONE_MILLION = ethers.utils.parseEther('1000000')

function prepareConfig(_strategies) {
  const interestFee =  '1500' // 15%
  const strategies = _strategies || [
    {
      name: 'AaveMakerStrategyETH',
      type: StrategyType.AAVE_MAKER,
      config: {interestFee, debtRatio: 5200, debtRate: ONE_MILLION},
    },
    {
      name: 'CompoundMakerStrategyETH',
      type: StrategyType.COMPOUND_MAKER,
      config: {interestFee, debtRatio: 4700, debtRate: ONE_MILLION},
    },
  ]
  beforeEach(async function () {
    const users = await getUsers()
    this.users = users
    await setupVPool(this, {
      poolConfig: PoolConfig.VETHEarn,
      feeCollector: users[7].address,
      strategies: strategies.map((item, i) => ({
        ...item,
        feeCollector: users[i + 8].address, // leave first 8 users for other testing
      })),
    })
  })
  return strategies
}

module.exports = {prepareConfig}