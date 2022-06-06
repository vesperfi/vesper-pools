'use strict'

const testRunner = require('../../utils/testRunner')

describe('VAWETHe Pool', function () {
  testRunner('VAWETHe', ['BenqiLeverageStrategyWETHe'], [{ debtRatio: 9000 }])
})
