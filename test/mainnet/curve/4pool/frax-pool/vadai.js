'use strict'

const testRunner = require('../../../../utils/testRunner')

describe('VADAI Pool', function () {
  testRunner('VADAI', ['Convex4MetaPoolStrategyFRAXPoolDAI'], [{ debtRatio: 10000 }])
})
