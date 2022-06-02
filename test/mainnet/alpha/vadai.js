'use strict'

const testRunner = require('../../utils/testRunner')

describe('VADAI Pool', function () {
  testRunner('VADAI', ['AlphaLendStrategyDAI'], [{ debtRatio: 9000 }])
})
