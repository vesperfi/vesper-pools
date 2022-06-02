'use strict'

const testRunner = require('../../../utils/testRunner')
const { address: Address } = require('../../../utils/chains').getChainData()

describe('VEDAI_LINK Pool', function () {
  testRunner('VEDAI_LINK', ['EarnVesperStrategyDAI_LINK'], [{ debtRatio: 9500 }], {
    growPool: { address: Address.Vesper.vLINK },
  })
})
