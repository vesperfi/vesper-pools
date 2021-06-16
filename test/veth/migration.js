'use strict'
const {prepareConfig} = require('./config')
const {shouldMigrateStrategies} = require('../behavior/strategy-migration')

/* eslint-disable mocha/no-setup-in-describe */
describe('vETH pool strategies migration', function () {
  prepareConfig()
  shouldMigrateStrategies('vETH')
})