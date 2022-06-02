'use strict'

const testRunner = require('../../utils/testRunner')

describe('VAUSDC Pool', function () {
  testRunner('VAUSDC', ['TraderJoeStrategyUSDC'], [{ debtRatio: 9000 }])
})
