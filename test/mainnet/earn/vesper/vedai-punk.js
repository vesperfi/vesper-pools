'use strict'

const testRunner = require('../../../utils/testRunner')
const { address: Address } = require('../../../utils/chains').getChainData()

describe('VEDAI_PUNK Pool', function () {
  testRunner('VEDAI_PUNK', ['EarnVesperStrategyDAI_PUNK'], [{ debtRatio: 9500 }], { tokens: [Address.PUNK] })
})
