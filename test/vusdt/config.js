'use strict'

const { getUsers, setupVPool } = require('../utils/setupHelper')
const StrategyType = require('../utils/strategyTypes')
let PoolConfig = require('../../helper/ethereum/poolConfig')
if (process.env.CHAIN === 'polygon') {
  PoolConfig = require('../../helper/polygon/poolConfig')
}
const { ethers } = require('hardhat')
const ONE_MILLION = ethers.utils.parseEther('1000000')

function prepareConfig(_strategies) {
  const interestFee = '1500' // 15%
  const strategies = _strategies || [
    {
      name: 'AaveStrategyUSDT',
      type: StrategyType.AAVE,
      config: { interestFee, debtRatio: 9000, debtRate: ONE_MILLION },
    },
    {
      name: 'CompoundStrategyUSDT',
      type: StrategyType.COMPOUND,
      config: { interestFee, debtRatio: 1000, debtRate: ONE_MILLION },
    },
  ]
  beforeEach(async function () {
    const users = await getUsers()
    this.users = users
    await setupVPool(this, {
      poolConfig: PoolConfig.VUSDT,
      feeCollector: users[7].address,
      strategies: strategies.map((item, i) => ({
        ...item,
        feeCollector: users[i + 8].address, // leave first 8 users for other testing
      })),
    })
  })
  return strategies
}

module.exports = { prepareConfig }
