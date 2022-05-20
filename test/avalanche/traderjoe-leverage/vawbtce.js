'use strict'

const testRunner = require('../../utils/testRunner')

describe('VAWBTCe Pool', function () {
  testRunner('VAWBTCe', ['TraderJoeLeverageStrategyWBTCe'], [{ debtRatio: 9000 }])
})
