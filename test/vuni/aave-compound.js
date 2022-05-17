'use strict'

const testRunner = require('../utils/testRunner')
describe('vUNI Pool', function () {
  testRunner('VUNI', ['AaveStrategyUNI', 'CompoundStrategyUNI'], [{ debtRatio: 4000 }, { debtRatio: 4000 }])
})
