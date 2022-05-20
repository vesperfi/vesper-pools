'use strict'

const testRunner = require('../../../../utils/testRunner')

describe('VAMIM Pool', function () {
  testRunner('VAMIM', ['Crv4MetaPoolStrategyMIMPoolMIM'], [{ debtRatio: 10000 }])
})
