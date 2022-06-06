'use strict'

const testRunner = require('../../utils/testRunner')

describe('VAWETHe Pool', function () {
  testRunner('VAWETHe', ['AaveStrategyWETHe'], [{ debtRatio: 9000 }])
})
