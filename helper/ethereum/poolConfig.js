'use strict'

const Address = require('./address')

const PoolConfig = {
  VDAI: {contractName: 'VPool', poolParams: ['vDAI Pool', 'vDAI', Address.DAI]},
  VADAI: {contractName: 'VPool', poolParams: ['vaDAI Pool', 'vaDAI', Address.DAI]},
  VAETH: {contractName: 'VETH', poolParams: ['vaETH Pool', 'vaETH']},
  VAWBTC: {contractName: 'VPool', poolParams: ['vaWBTC Pool', 'vaWBTC', Address.WBTC]},
  VETHEarn: {contractName: 'VETH', poolParams: ['veETH-DAI Earn Pool', 'veETH-DAI']},
  VLINK: {contractName: 'VPool', poolParams: ['vLINK Pool', 'vLINK', Address.LINK]},
  VUNI: {contractName: 'VPool', poolParams: ['vUNI Pool', 'vUNI', Address.UNI]},
  VUSDC: {contractName: 'VPool', poolParams: ['vUSDC Pool', 'vUSDC', Address.USDC]},
  VUSDT: {contractName: 'VPool', poolParams: ['vUSDT Pool', 'vUSDT', Address.USDT]},
  VFRStableDAI: {contractName: 'VFRStablePool', poolParams: ['vfrsDAI Pool', 'vfrsDAI', Address.DAI]},
  VFRCoverageDAI: {contractName: 'VFRCoveragePool', poolParams: ['vfrcDAI Pool', 'vfrcDAI', Address.DAI]},
}

module.exports = Object.freeze(PoolConfig)
