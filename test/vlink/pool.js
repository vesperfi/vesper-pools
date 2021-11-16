'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { shouldBehaveLikeMultiPool } = require('../behavior/vesper-multi-pool')

// Skipping CREAM strategy tests
describe.skip('vLINK Pool', function () {
  prepareConfig()
  shouldBehaveLikePool('vLINK', 'LINK')
  shouldBehaveLikeMultiPool('vLINK')
})
