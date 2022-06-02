'use strict'

const testRunner = require('../../utils/testRunner')

describe('VAWBTCe Pool', function () {
  testRunner('VAWBTCe', ['AaveStrategyWBTCe'], [{ debtRatio: 9000 }])
})
