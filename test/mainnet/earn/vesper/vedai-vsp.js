'use strict'

const testRunner = require('../../../utils/testRunner')
const { address: Address } = require('../../../utils/chains').getChainData()

describe('VEDAI_VSP Pool', function () {
  testRunner('VEDAI_VSP', ['EarnVesperStrategyDAIVSP'], [{ debtRatio: 9000 }], {
    growPool: { address: Address.Vesper.vVSP },
  })
})
