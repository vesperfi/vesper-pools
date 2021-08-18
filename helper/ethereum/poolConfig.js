'use strict'

const Address = require('./address')

const PoolConfig = {
  VDAI: {contractName: 'VPool', poolParams: ['vDAI Pool', 'vDAI', Address.DAI]},
  VADAI: {contractName: 'VPool', poolParams: ['vaDAI Pool', 'vaDAI', Address.DAI]},
  VAETH: {contractName: 'VETH', poolParams: ['vaETH Pool', 'vaETH']},
  VETHEarn: {contractName: 'VETH', poolParams: ['veETH-DAI Earn Pool', 'veETH-DAI']},
  VLINK: {contractName: 'VPool', poolParams: ['vLINK Pool', 'vLINK', Address.LINK]},
  VUNI: {contractName: 'VPool', poolParams: ['vUNI Pool', 'vUNI', Address.UNI]},
  VUSDC: {contractName: 'VPool', poolParams: ['vUSDC Pool', 'vUSDC', Address.USDC]},
  VUSDT: {contractName: 'VPool', poolParams: ['vUSDT Pool', 'vUSDT', Address.USDT]},
  VFRDAI: {contractName: 'VFRPool', poolParams: ['vfrDAI Pool', 'vfrDAI', Address.DAI]},
}

module.exports = Object.freeze(PoolConfig)
