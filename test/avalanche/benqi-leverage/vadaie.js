'use strict'

const testRunner = require('../../utils/testRunner')

describe('VADAIe Pool', function () {
  testRunner('VADAIe', ['BenqiLeverageStrategyDAIe'], [{ debtRatio: 9000 }])
})
