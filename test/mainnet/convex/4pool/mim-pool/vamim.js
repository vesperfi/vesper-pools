'use strict'

const testRunner = require('../../../../utils/testRunner')

describe('VAMIM Pool', function () {
  testRunner('VAMIM', ['Convex4MetaPoolStrategyMIMPoolMIM'], [{ debtRatio: 10000 }])
})
