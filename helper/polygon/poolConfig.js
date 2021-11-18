'use strict'

const Address = require('./address')

const { ADDRESS_LIST_FACTORY: addressListFactory, FEE_COLLECTOR: feeCollector } = Address
const withdrawFee = 60

const PoolConfig = {
  VDAI: {
    contractName: 'VPool',
    poolParams: ['vDAI Pool', 'vDAI', Address.DAI],
    addressListFactory,
    withdrawFee,
    feeCollector,
  },
  VUSDC: {
    contractName: 'VPool',
    poolParams: ['vUSDC Pool', 'vUSDC', Address.USDC],
    addressListFactory,
    withdrawFee,
    feeCollector,
  },
  VUSDT: {
    contractName: 'VPool',
    poolParams: ['vUSDT Pool', 'vUSDT', Address.USDT],
    addressListFactory,
    withdrawFee,
    feeCollector,
  },
  VWETH: {
    contractName: 'VPool',
    poolParams: ['vWETH Pool', 'vWETH', Address.WETH],
    addressListFactory,
    withdrawFee,
    feeCollector,
  },
  VWBTC: {
    contractName: 'VPool',
    poolParams: ['vWBTC Pool', 'vWBTC', Address.WBTC],
    addressListFactory,
    withdrawFee,
    feeCollector,
  },
}

module.exports = Object.freeze(PoolConfig)
