'use strict'

const testRunner = require('../../../../utils/testRunner')

describe('VAWBTC Pool', function () {
  testRunner('VAWBTC', ['ConvexSBTCPoolStrategyWBTC'], [{ debtRatio: 10000 }])
})
