'use strict'

const {shouldBehaveLikePool} = require('../behavior/vesper-pool')
const {shouldBehaveLikeMultiPool} = require('../behavior/vesper-multi-pool')
// const {shouldBehaveLikeStrategy} = require('../behavior/aave-strategy')
const {getUsers, setupVPool} = require('../utils/setupHelper')
const StrategyType = require('../utils/strategyTypes')
const {BigNumber: BN} = require('ethers')
const DECIMAL18 = BN.from('1000000000000000000')
const ONE_MILLION = DECIMAL18.mul('1000000')
/* eslint-disable mocha/no-setup-in-describe */
describe('vUSDC Pool with AaveStrategy', function () {
  const interestFee = '1500' // 15%

  const config1 = {interestFee, debtRatio: 9000, debtRate: ONE_MILLION}
  const config2 = {interestFee, debtRatio: 0, debtRate: ONE_MILLION}

  beforeEach(async function () {
    const users = await getUsers()
    this.users = users
    await setupVPool(this, {
      poolName: 'VUSDC',
      feeCollector: users[9].address,
      strategies: [
        {name: 'AaveStrategyUSDC', type: StrategyType.AAAVE, config: config1, feeCollector: users[9].address},
        {name: 'CompoundStrategyUSDC', type: StrategyType.COMPOUND, config: config2, feeCollector: users[8].address}
      ],
    })

    
  })

  shouldBehaveLikePool('vUSDC', 'USDC')
  shouldBehaveLikeMultiPool('vUSDC')
  // shouldBehaveLikeStrategy('vDai', 'DAI', StrategyType.AAAVE)
})
