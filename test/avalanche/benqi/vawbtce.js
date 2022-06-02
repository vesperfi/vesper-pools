'use strict'

const testRunner = require('../../utils/testRunner')

describe('VAWBTCe Pool', function () {
  testRunner('VAWBTCe', ['BenqiStrategyWBTCe'], [{ debtRatio: 9000 }])
})
