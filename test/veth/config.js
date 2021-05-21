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
      poolName: 'VETH',
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