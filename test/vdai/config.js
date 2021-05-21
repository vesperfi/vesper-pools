'use strict'

const {getUsers, setupVPool} = require('../utils/setupHelper')
const StrategyType = require('../utils/strategyTypes')
const {BigNumber: BN} = require('ethers')
const DECIMAL18 = BN.from('1000000000000000000')
const ONE_MILLION = DECIMAL18.mul('1000000')

function prepareConfig() {
  const interestFee = '1500' // 15%
  const strategies = [
    {
      name: 'AaveStrategyDAI',
      type: StrategyType.AAVE,
      config: {interestFee, debtRatio: 9000, debtRate: ONE_MILLION},
    },
    {
      name: 'CompoundStrategyDAI',
      type: StrategyType.COMPOUND,
      config: {interestFee, debtRatio: 1000, debtRate: ONE_MILLION},
    },
  ]
  beforeEach(async function () {
    const users = await getUsers()
    this.users = users
    await setupVPool(this, {
      poolName: 'VDAI',
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