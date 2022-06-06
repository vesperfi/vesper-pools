'use strict'

const testRunner = require('../../utils/testRunner')

describe('VAUSDCe Pool', function () {
  testRunner('VAUSDCe', ['CrvA3PoolStrategyUSDCe'], [{ debtRatio: 9000 }])
})
