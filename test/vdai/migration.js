'use strict'
const { prepareConfig } = require('./config')

const { shouldMigrateStrategies } = require('../behavior/strategy-migration')

describe('vDAI pool strategies migration', function () {
  prepareConfig()
  shouldMigrateStrategies('vDAI')
})
