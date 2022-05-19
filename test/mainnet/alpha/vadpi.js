'use strict'

const testRunner = require('../../utils/testRunner')

describe('VADPI Pool', function () {
  testRunner('VADPI', ['AlphaLendStrategyDPI'], [{ debtRatio: 9000 }])
})
