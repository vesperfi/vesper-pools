'use strict'

const {shouldBehaveLikePool} = require('../behavior/vesper-pool')
// const {shouldBehaveLikeMultiPool} = require('../behavior/vesper-multi-pool')
// const {shouldBehaveLikeStrategy} = require('../behavior/aave-strategy')
const {getUsers, setupVPool} = require('../utils/setupHelper')
const StrategyType = require('../utils/strategyTypes')
const {constants} = require('@openzeppelin/test-helpers')

/* eslint-disable mocha/no-setup-in-describe */
describe('vDAI Pool with AaveStrategy', function () {
  const interestFee = '1500' // 15%

  const config1 = {interestFee, debtRatio: 9000, maxDebtPerRebalance: constants.MAX_UINT256.toString()}
  const config2 = {interestFee, debtRatio: 0, maxDebtPerRebalance: constants.MAX_UINT256.toString()}

  beforeEach(async function () {
    const users = await getUsers()
    this.users = users
    await setupVPool(this, {
      poolName: 'VDAI',
      feeCollector: users[9].address,
      strategies: [
        {name: 'AaveStrategyDAI', type: StrategyType.AAAVE, config: config1, feeCollector: users[9].address},
        {name: 'CompoundStrategyDAI', type: StrategyType.COMPOUND, config: config2, feeCollector: users[8].address},
      ],
    })

    
  })

  shouldBehaveLikePool('vDai', 'DAI')
  // TODO update below test suites according to hardhat
  // shouldBehaveLikeMultiPool('vDai')
  // shouldBehaveLikeStrategy('vDai', 'DAI', StrategyType.AAAVE)
})
