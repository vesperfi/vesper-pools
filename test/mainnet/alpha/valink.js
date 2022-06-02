'use strict'

const testRunner = require('../../utils/testRunner')

describe('VALINK Pool', function () {
  testRunner('VALINK', ['AlphaLendStrategyLINK'], [{ debtRatio: 9000 }])
})
