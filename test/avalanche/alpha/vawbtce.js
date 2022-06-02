'use strict'

const testRunner = require('../../utils/testRunner')

describe('VAWBTCe Pool', function () {
  testRunner('VAWBTCe', ['AlphaLendStrategyWBTCe'], [{ debtRatio: 9000 }])
})
