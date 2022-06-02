'use strict'

const testRunner = require('../../../utils/testRunner')

describe('VAWBTCe Pool', function () {
  testRunner('VAWBTCe', ['VesperBenqiXYStrategyWBTCe_WETHe'], [{ debtRatio: 9000 }])
})
