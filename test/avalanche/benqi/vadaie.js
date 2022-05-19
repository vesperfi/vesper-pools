'use strict'

const testRunner = require('../../utils/testRunner')

describe('VADAIe Pool', function () {
  testRunner('VADAIe', ['BenqiStrategyDAIe'], [{ debtRatio: 9500 }])
})
