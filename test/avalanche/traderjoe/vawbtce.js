'use strict'

const testRunner = require('../../utils/testRunner')

describe('VAWBTCe Pool', function () {
  testRunner('VAWBTCe', ['TraderJoeStrategyWBTCe'], [{ debtRatio: 9000 }])
})
