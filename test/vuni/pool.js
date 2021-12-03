'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { shouldBehaveLikeMultiPool } = require('../behavior/vesper-multi-pool_new')

describe('vUNI Pool', function () {
  prepareConfig()
  shouldBehaveLikePool('vUni', 'UNI')
  shouldBehaveLikeMultiPool('vUni')
})
