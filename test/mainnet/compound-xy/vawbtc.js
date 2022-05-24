'use strict'

const testRunner = require('../../utils/testRunner')

describe('VAWBTC Pool', function () {
  testRunner('VAWBTC', ['CompoundXYStrategyWBTC_DAI'], [{ debtRatio: 9000 }])
})
