'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { shouldBehaveLikeMultiPool } = require('../behavior/vesper-multi-pool')

describe('vLINK Pool', function () {
  prepareConfig()
  shouldBehaveLikePool('vLINK', 'LINK')
  shouldBehaveLikeMultiPool('vLINK')
})
