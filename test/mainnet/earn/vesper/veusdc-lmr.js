'use strict'

const testRunner = require('../../../utils/testRunner')
const { address: Address } = require('../../../utils/chains').getChainData()

describe('VEUSDC_LMR Pool', function () {
  testRunner('VEUSDC_LMR', ['EarnVesperStrategyUSDC_LMR'], [{ debtRatio: 9500 }], { tokens: [Address.LMR] })
})
