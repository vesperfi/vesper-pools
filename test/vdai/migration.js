'use strict'
const { prepareConfig } = require('./config')

const { shouldMigrateStrategies } = require('../behavior/strategy-migration_new')

describe('vDAI pool strategies migration', function () {
  prepareConfig()
  shouldMigrateStrategies('vDAI')
})
