'use strict'

const Address = require('./address')

const PoolConfig = {
  VDAI: {
    contractName: 'VPool',
    poolParams: ['vDAI Pool', 'vDAI', Address.DAI],
    addressListFactory: Address.ADDRESS_LIST_FACTORY,
    withdrawFee: 60,
    feeCollector: Address.FEE_COLLECTOR,
  },
  VADAI: {
    contractName: 'VPool',
    poolParams: ['vaDAI Pool', 'vaDAI', Address.DAI],
    addressListFactory: Address.ADDRESS_LIST_FACTORY,
    withdrawFee: 60,
    feeCollector: Address.FEE_COLLECTOR,
  },
  VAETH: {
    contractName: 'VETH',
    poolParams: ['vaETH Pool', 'vaETH'],
    addressListFactory: Address.ADDRESS_LIST_FACTORY,
    withdrawFee: 60,
    feeCollector: Address.FEE_COLLECTOR,
  },
  VAWBTC: {
    contractName: 'VPool',
    poolParams: ['vaWBTC Pool', 'vaWBTC', Address.WBTC],
    addressListFactory: Address.ADDRESS_LIST_FACTORY,
    withdrawFee: 60,
    feeCollector: Address.FEE_COLLECTOR,
  },
  VEETH_DAI: {
    contractName: 'VETH',
    poolParams: ['veETH-DAI Earn Pool', 'veETH-DAI'],
    addressListFactory: Address.ADDRESS_LIST_FACTORY,
    withdrawFee: 60,
    feeCollector: Address.FEE_COLLECTOR,
  },
  VEWBTC_DAI: {
    contractName: 'VPool',
    poolParams: ['veWBTC-DAI Earn Pool', 'veWBTC-DAI', Address.WBTC],
    addressListFactory: Address.ADDRESS_LIST_FACTORY,
    withdrawFee: 60,
    feeCollector: Address.FEE_COLLECTOR,
  },
  VLINK: {
    contractName: 'VPool',
    poolParams: ['vLINK Pool', 'vLINK', Address.LINK],
    addressListFactory: Address.ADDRESS_LIST_FACTORY,
    withdrawFee: 60,
    feeCollector: Address.FEE_COLLECTOR,
  },
  VUNI: {
    contractName: 'VPool',
    poolParams: ['vUNI Pool', 'vUNI', Address.UNI],
    addressListFactory: Address.ADDRESS_LIST_FACTORY,
    withdrawFee: 60,
    feeCollector: Address.FEE_COLLECTOR,
  },
  VUSDC: {
    contractName: 'VPool',
    poolParams: ['vUSDC Pool', 'vUSDC', Address.USDC],
    addressListFactory: Address.ADDRESS_LIST_FACTORY,
    withdrawFee: 60,
    feeCollector: Address.FEE_COLLECTOR,
  },
  VAUSDC: {
    contractName: 'VPool',
    poolParams: ['vaUSDC Pool', 'vaUSDC', Address.USDC],
    addressListFactory: Address.ADDRESS_LIST_FACTORY,
    withdrawFee: 60,
    feeCollector: Address.FEE_COLLECTOR,
  },
  VUSDT: {
    contractName: 'VPool',
    poolParams: ['vUSDT Pool', 'vUSDT', Address.USDT],
    addressListFactory: Address.ADDRESS_LIST_FACTORY,
    withdrawFee: 60,
    feeCollector: Address.FEE_COLLECTOR,
  },
  VMIM: {
    contractName: 'VPool',
    poolParams: ['vMIM Pool', 'vMIM', Address.MIM],
    addressListFactory: Address.ADDRESS_LIST_FACTORY,
    withdrawFee: 60,
    feeCollector: Address.FEE_COLLECTOR,
  },
  VFRStableDAI: {
    contractName: 'VFRStablePool',
    poolParams: ['vfrsDAI Pool', 'vfrsDAI', Address.DAI],
    addressListFactory: Address.ADDRESS_LIST_FACTORY,
    withdrawFee: 60,
    feeCollector: Address.FEE_COLLECTOR,
  },
  VFRCoverageDAI: {
    contractName: 'VFRCoveragePool',
    poolParams: ['vfrcDAI Pool', 'vfrcDAI', Address.DAI],
    addressListFactory: Address.ADDRESS_LIST_FACTORY,
    withdrawFee: 60,
    feeCollector: Address.FEE_COLLECTOR,
  },
}

module.exports = Object.freeze(PoolConfig)
