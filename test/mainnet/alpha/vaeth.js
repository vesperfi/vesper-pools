'use strict'

const testRunner = require('../../utils/testRunner')

describe('VAETH Pool', function () {
  testRunner('VAETH', ['AlphaLendStrategyETH'], [{ debtRatio: 9000 }])
})
