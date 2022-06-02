'use strict'

const testRunner = require('../../utils/testRunner')

describe('VAUNI Pool', function () {
  testRunner('VAUNI', ['CompoundStrategyUNI'], [{ debtRatio: 9000 }])
})
