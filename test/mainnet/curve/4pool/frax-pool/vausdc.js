'use strict'

const testRunner = require('../../../../utils/testRunner')

describe('VAUSDC Pool', function () {
  testRunner('VAUSDC', ['Convex4MetaPoolStrategyFRAXPoolUSDC'], [{ debtRatio: 10000 }])
})
