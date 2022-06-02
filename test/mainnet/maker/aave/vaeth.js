'use strict'

const testRunner = require('../../../utils/testRunner')

describe('VAETH Pool', function () {
  testRunner('VAETH', ['AaveMakerStrategyETH'], [{ debtRatio: 9000 }])
})
