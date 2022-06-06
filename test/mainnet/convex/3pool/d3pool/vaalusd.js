'use strict'

const testRunner = require('../../../../utils/testRunner')

describe('VAALUSD Pool', function () {
  testRunner('VAALUSD', ['ConvexD3PoolStrategyAlUSD'], [{ debtRatio: 9500 }])
})
