'use strict'

const testRunner = require('../../utils/testRunner')

describe('VADAIe Pool', function () {
  testRunner('VADAIe', ['CrvA3PoolStrategyDAIe'], [{ debtRatio: 9000 }])
})
