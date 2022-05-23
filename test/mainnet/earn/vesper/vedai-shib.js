'use strict'

const testRunner = require('../../../utils/testRunner')
const { address: Address } = require('../../../utils/chains').getChainData()

describe('VEDAI_SHIB Pool', function () {
  testRunner('VEDAI_SHIB', ['EarnVesperStrategyDAISHIB'], [{ debtRatio: 9500 }], { tokens: [Address.SHIB] })
})
