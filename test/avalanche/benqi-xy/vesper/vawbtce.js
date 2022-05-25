'use strict'

const testRunner = require('../../../utils/testRunner')

describe('VAWBTCe Pool', function () {
  testRunner('VAWBTCe', ['VesperBenqiXYStrategyWBTCe'], [{ debtRatio: 9000 }])
})
