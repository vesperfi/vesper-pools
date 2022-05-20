'use strict'

const testRunner = require('../../utils/testRunner')

describe('VAWETHe Pool', function () {
  testRunner('VAWETHe', ['BenqiStrategyWETHe'], [{ debtRatio: 9000 }])
})
