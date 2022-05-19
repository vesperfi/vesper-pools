'use strict'

const testRunner = require('../../utils/testRunner')

describe('VAQI Pool', function () {
  testRunner('VAQI', ['BenqiStrategyQI'], [{ debtRatio: 9600 }])
})
