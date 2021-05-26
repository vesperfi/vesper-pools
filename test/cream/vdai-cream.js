'use strict'

const {shouldBehaveLikePool} = require('../behavior/vesper-pool')
const {shouldBehaveLikeStrategy} = require('../behavior/strategy')
const {getUsers, setupVPool} = require('../utils/setupHelper')
const StrategyType = require('../utils/strategyTypes')
const {BigNumber: BN} = require('ethers')
const DECIMAL18 = BN.from('1000000000000000000')
const ONE_MILLION = DECIMAL18.mul('1000000')
/* eslint-disable mocha/no-setup-in-describe */
describe('vDAI Pool', function () {
  const interestFee = '1500' // 15%
  const strategies = [
    {
      name: 'CreamStrategyDAI',
      type: StrategyType.CREAM,
      config: {interestFee, debtRatio: 9000, debtRate: ONE_MILLION}
    }
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
  shouldBehaveLikePool('vDAI', 'DAI')
  shouldBehaveLikeStrategy(0, strategies[0].type, strategies[0].name)  
  
})