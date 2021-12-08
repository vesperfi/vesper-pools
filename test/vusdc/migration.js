'use strict'
const { prepareConfig } = require('./config')
const { shouldMigrateStrategies } = require('../behavior/strategy-migration_new')

describe('vUSDC pool strategies migration', function () {
  prepareConfig()
  shouldMigrateStrategies('vUSDC')
})
