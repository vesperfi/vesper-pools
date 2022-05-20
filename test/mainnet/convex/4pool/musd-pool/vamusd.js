'use strict'

const testRunner = require('../../../../utils/testRunner')

describe('VAMUSD Pool', function () {
  testRunner('VAMUSD', ['Convex4PoolStrategyMUSDPoolMUSD'], [{ debtRatio: 10000 }])
})
