'use strict'

const testRunner = require('../../utils/testRunner')

describe('VAWBTC Pool', function () {
  testRunner('VAWBTC', ['CompoundXYStrategyWBTC'], [{ debtRatio: 9000 }])
})
