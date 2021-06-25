'use strict'

const {prepareConfig} = require('./config')
const {shouldBehaveLikePool} = require('../behavior/vesper-pool')
const {shouldBehaveLikeMultiPool} = require('../behavior/vesper-multi-pool')

describe('vDAI Pool', function () {
  
  prepareConfig()
  shouldBehaveLikePool('vDai', 'DAI')
  shouldBehaveLikeMultiPool('vDai')
})
