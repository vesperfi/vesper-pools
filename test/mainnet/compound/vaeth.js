'use strict'

const testRunner = require('../../utils/testRunner')

describe('VAETH Pool', function () {
  testRunner('VAETH', ['CompoundStrategyETH'], [{ debtRatio: 9000 }])
})
