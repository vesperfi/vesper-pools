'use strict'

const testRunner = require('../../utils/testRunner')

describe('VAWETHe Pool', function () {
  testRunner('VAWETHe', ['AlphaLendStrategyWETHe'], [{ debtRatio: 9000 }])
})
