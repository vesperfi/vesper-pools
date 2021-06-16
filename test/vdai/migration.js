'use strict'
const {prepareConfig} = require('./config')
const {shouldMigrateStrategies} = require('../behavior/strategy-migration')

describe('vUSDC pool strategies migration', function () {
  prepareConfig()
  shouldMigrateStrategies('vDai')
})
