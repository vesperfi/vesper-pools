'use strict'

const Address = require('./address')

const PoolConfig = {
  VDAI: {contractName: 'VPool', poolParams: ['vDAI Pool', 'vDAI', Address.DAI]},
  VUSDC: {contractName: 'VPool', poolParams: ['vUSDC Pool', 'vUSDC', Address.USDC]},
  VUSDT: {contractName: 'VPool', poolParams: ['vUSDT Pool', 'vUSDT', Address.USDT]},
  VWETH: {contractName: 'VPool', poolParams: ['vWETH Pool', 'vWETH', Address.WETH]},
  VWBTC: {contractName: 'VPool', poolParams: ['vWBTC Pool', 'vWBTC', Address.WBTC]},
}

module.exports = Object.freeze(PoolConfig)
