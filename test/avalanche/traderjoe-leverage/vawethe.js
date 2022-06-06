'use strict'

const testRunner = require('../../utils/testRunner')

describe('VAWETHe Pool', function () {
  testRunner('VAWETHe', ['TraderJoeLeverageStrategyWETHe'], [{ debtRatio: 9000 }])
})
