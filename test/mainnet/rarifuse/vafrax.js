'use strict'

const testRunner = require('../../utils/testRunner')

describe('VAFRAX Pool', function () {
  testRunner('VAFRAX', ['RariFuseStrategyFRAX'], [{ debtRatio: 9000 }])
})
