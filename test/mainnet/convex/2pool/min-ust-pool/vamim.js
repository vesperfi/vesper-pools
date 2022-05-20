'use strict'

const testRunner = require('../../../../utils/testRunner')

describe('VAMIM Pool', function () {
  testRunner('VAMIM', ['Convex2PoolStrategyMIMUSTPoolMIM'], [{ debtRatio: 10000 }])
})
