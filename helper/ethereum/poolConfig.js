'use strict'

const Address = require('./address')

const PoolConfig = {
  VDAI: {contractName: 'VPool', poolParams: ['vDAI Pool', 'vDAI', Address.DAI]},
  VADAI: {contractName: 'VPool', poolParams: ['vaDAI Pool', 'vaDAI', Address.DAI]},
  VAETH: {contractName: 'VETH', poolParams: ['vaETH Pool', 'vaETH']},
  VAWBTC: {contractName: 'VPool', poolParams: ['vaWBTC Pool', 'vaWBTC', Address.WBTC]},
  VEETH_DAI: {contractName: 'VETH', poolParams: ['veETH-DAI Earn Pool', 'veETH-DAI']},
  VEWBTC_DAI: {contractName: 'VPool', poolParams: ['veWBTC-DAI Earn Pool', 'veWBTC-DAI', Address.WBTC]},
  VLINK: {contractName: 'VPool', poolParams: ['vLINK Pool', 'vLINK', Address.LINK]},
  VUNI: {contractName: 'VPool', poolParams: ['vUNI Pool', 'vUNI', Address.UNI]},
  VUSDC: {contractName: 'VPool', poolParams: ['vUSDC Pool', 'vUSDC', Address.USDC]},
  VUSDT: {contractName: 'VPool', poolParams: ['vUSDT Pool', 'vUSDT', Address.USDT]},
  VMIM: {contractName: 'VPool', poolParams: ['vMIM Pool', 'vMIM', Address.MIM]},
  VFRStableDAI: {contractName: 'VFRStablePool', poolParams: ['vfrsDAI Pool', 'vfrsDAI', Address.DAI]},
  VFRCoverageDAI: {contractName: 'VFRPool', poolParams: ['vfrcDAI Pool', 'vfrcDAI', Address.DAI]},
}

module.exports = Object.freeze(PoolConfig)
