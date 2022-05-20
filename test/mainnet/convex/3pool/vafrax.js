'use strict'

const testRunner = require('../../../utils/testRunner')

describe('VAFRAX Pool', function () {
  testRunner('VAFRAX', ['ConvexD3PoolStrategyFRAX'], [{ debtRatio: 9000 }])
})
