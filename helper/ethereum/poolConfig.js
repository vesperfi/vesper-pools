'use strict'

const Address = require('./address')

const PoolConfig = {
  VDAI: {contractName: 'VPool', poolParams: ['vDAI Pool', 'vDAI', Address.DAI]},
  VADAI: {contractName: 'VPool', poolParams: ['vaDAI Pool', 'vaDAI', Address.DAI]},
  VETH: {contractName: 'VETH', poolParams: []},
  VLINK: {contractName: 'VPool', poolParams: ['vLINK Pool', 'vLINK', Address.LINK]},
  VUNI: {contractName: 'VPool', poolParams: ['vUNI Pool', 'vUNI', Address.UNI]},
  VUSDC: {contractName: 'VPool', poolParams: ['vUSDC Pool', 'vUSDC', Address.USDC]},
  VUSDT: {contractName: 'VPool', poolParams: ['vUSDT Pool', 'vUSDT', Address.USDT]},
}

module.exports = Object.freeze(PoolConfig)
