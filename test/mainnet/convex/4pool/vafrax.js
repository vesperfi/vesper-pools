'use strict'

const testRunner = require('../../../utils/testRunner')

describe('VAFRAX Pool', function () {
  testRunner('VAFRAX', ['Convex4MetaPoolStrategyFRAXPoolFRAX'], [{ debtRatio: 10000 }])
})
