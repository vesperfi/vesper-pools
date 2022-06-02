'use strict'

const testRunner = require('../../utils/testRunner')

describe('VAWBTCe Pool', function () {
  testRunner('VAWBTCe', ['BenqiLeverageStrategyWBTCe'], [{ debtRatio: 9000 }])
})
