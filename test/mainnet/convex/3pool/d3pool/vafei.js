'use strict'

const testRunner = require('../../../../utils/testRunner')

describe('VAFEI Pool', function () {
  testRunner('VAFEI', ['ConvexD3PoolStrategyFEI'], [{ debtRatio: 9500 }])
})
