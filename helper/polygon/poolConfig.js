'use strict'

const Address = require('./address')

const PoolConfig = {
  VDAI: {contractName: 'VPool', poolParams: ['vDAI Pool', 'vDAI', Address.DAI]}
}

module.exports = Object.freeze(PoolConfig)
