'use strict'

const testRunner = require('../../utils/testRunner')

describe('VADAIe Pool', function () {
  testRunner('VADAIe', ['TraderJoeLeverageStrategyDAIe'], [{ debtRatio: 9000 }])
})
