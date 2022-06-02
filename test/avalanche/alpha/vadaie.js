'use strict'

const testRunner = require('../../utils/testRunner')

describe('VADAIe Pool', function () {
  testRunner('VADAIe', ['AlphaLendStrategyDAIe'], [{ debtRatio: 9000 }])
})
