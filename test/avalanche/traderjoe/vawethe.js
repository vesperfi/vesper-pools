'use strict'

const testRunner = require('../../utils/testRunner')

describe('VAWETHe Pool', function () {
  testRunner('VAWETHe', ['TraderJoeStrategyWETHe'], [{ debtRatio: 9000 }])
})
