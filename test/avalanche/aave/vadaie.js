'use strict'

const testRunner = require('../../utils/testRunner')

describe('VADAIe Pool', function () {
  testRunner('VADAIe', ['AaveStrategyDAIe'], [{ debtRatio: 9000 }])
})
