'use strict'

const testRunner = require('../../utils/testRunner')

describe('VADAIe Pool', function () {
  testRunner('VADAIe', ['TraderJoeStrategyDAIe'], [{ debtRatio: 9000 }])
})
