'use strict'

const testRunner = require('../../../utils/testRunner')

describe('VAETH Pool', function () {
  testRunner('VAETH', ['VesperMakerStrategyETH'], [{ debtRatio: 9000 }])
})
