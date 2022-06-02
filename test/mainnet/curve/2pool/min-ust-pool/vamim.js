'use strict'

const testRunner = require('../../../../utils/testRunner')

describe('VAMIM Pool', function () {
  testRunner('VAMIM', ['Crv2PoolStrategyMIMUSTPoolMIM'], [{ debtRatio: 10000 }])
})
