'use strict'

const testRunner = require('../../utils/testRunner')

describe('VAETH Pool', function () {
  testRunner('VAETH', ['InverseCompoundStrategyETH'], [{ debtRatio: 9000 }])
})
