'use strict'
const {prepareConfig} = require('./config')
const {shouldMigrateStrategies} = require('../behavior/strategy-migration')

describe('vETH pool strategies migration', function () {
  prepareConfig()
  shouldMigrateStrategies('vETH')
})
