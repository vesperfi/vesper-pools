'use strict'

const testRunner = require('../../../../utils/testRunner')

describe('VADAI Pool', function () {
  testRunner('VADAI', ['Crv4MetaPoolStrategyMIMPoolDAI'], [{ debtRatio: 10000 }])
})
