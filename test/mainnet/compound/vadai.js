'use strict'

const testRunner = require('../../utils/testRunner')

describe('VADAI Pool', function () {
  testRunner('VADAI', ['CompoundStrategyDAI'], [{ debtRatio: 9000 }])
})
