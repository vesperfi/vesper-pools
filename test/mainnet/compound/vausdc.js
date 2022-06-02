'use strict'

const testRunner = require('../../utils/testRunner')

describe('VAUSDC Pool', function () {
  testRunner('VAUSDC', ['CompoundStrategyUSDC'], [{ debtRatio: 9000 }])
})
