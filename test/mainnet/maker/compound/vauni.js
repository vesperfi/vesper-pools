'use strict'

const testRunner = require('../../../utils/testRunner')

describe('VAUNI Pool', function () {
  testRunner('VAUNI', ['CompoundMakerStrategyUNI'], [{ debtRatio: 9000 }])
})
