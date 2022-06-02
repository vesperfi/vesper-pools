'use strict'

const testRunner = require('../../../utils/testRunner')

describe('VADAI Pool', function () {
  testRunner('VADAI', ['Convex3PoolStrategyDAI'], [{ debtRatio: 10000 }])
})
