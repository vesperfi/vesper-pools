'use strict'

const testRunner = require('../../utils/testRunner')

describe('VAUSDC Pool', function () {
  testRunner('VAUSDC', ['BenqiStrategyUSDC'], [{ debtRatio: 9500 }])
})
