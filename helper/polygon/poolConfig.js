'use strict'

const Address = require('./address')

const setup = { addressListFactory: Address.ADDRESS_LIST_FACTORY, feeCollector: Address.FEE_COLLECTOR, withdrawFee: 60 }
const rewards = { contract: 'PoolRewards', tokens: [Address.VSP] }

const PoolConfig = {
  VDAI: {
    contractName: 'VPool',
    poolParams: ['vDAI Pool', 'vDAI', Address.DAI],
    setup: { ...setup }, // Shallow copy
    rewards: { ...rewards },
  },
  VUSDC: {
    contractName: 'VPool',
    poolParams: ['vUSDC Pool', 'vUSDC', Address.USDC],
    setup: { ...setup },
    rewards: { ...rewards },
  },
  VUSDT: {
    contractName: 'VPool',
    poolParams: ['vUSDT Pool', 'vUSDT', Address.USDT],
    setup: { ...setup },
    rewards: { ...rewards },
  },
  VWETH: {
    contractName: 'VPool',
    poolParams: ['vWETH Pool', 'vWETH', Address.WETH],
    setup: { ...setup },
    rewards: { ...rewards },
  },
  VWBTC: {
    contractName: 'VPool',
    poolParams: ['vWBTC Pool', 'vWBTC', Address.WBTC],
    setup: { ...setup },
    rewards: { ...rewards },
  },
  VMATIC: {
    contractName: 'VETH',
    poolParams: ['vMATIC Pool', 'vMATIC', Address.WMATIC],
    setup: { ...setup },
    rewards: { ...rewards },
  },
}

module.exports = Object.freeze(PoolConfig)
