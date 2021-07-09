'use strict'

const Address = require('./address')

const PoolConfig = {
  VDAI: {contractName: 'VPool', poolParams: ['vDAI Pool', 'vDAI', Address.DAI]},
  VETH: {contractName: 'VETH', poolParams: []},
  VUSDC: {contractName: 'VPool', poolParams: ['vUSDC Pool', 'vUSDC', Address.USDC]}
}

module.exports = Object.freeze(PoolConfig)
