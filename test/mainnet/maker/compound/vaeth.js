'use strict'

const testRunner = require('../../../utils/testRunner')

describe('VAETH Pool', function () {
  testRunner('VAETH', ['CompoundMakerStrategyETH'], [{ debtRatio: 9000 }])
})
