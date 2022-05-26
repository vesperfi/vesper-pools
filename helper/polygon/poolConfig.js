'use strict'

const Address = require('./address')

const setup = { universalFee: 200 }
const rewards = { contract: 'PoolRewards', tokens: [Address.Vesper.VSP] }
// Earn pool will have extra data in 'rewards' object. Below is default value for 'rewards' object for Earn pools
const earnRewards = {
  contract: 'VesperEarnDrip',
  tokens: [Address.Vesper.vaDAI, Address.Vesper.VSP],
  growToken: Address.Vesper.vaDAI,
}

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
  VEDAI_WETH: {
    contractName: 'VPool',
    poolParams: ['veDAI-WETH Earn Pool', 'veDAI-WETH', Address.DAI],
    setup: { ...setup },
    rewards: { ...earnRewards, tokens: [Address.VWETH, Address.Vesper.VSP], growToken: Address.VWETH },
  },
  VEDAI_WBTC: {
    contractName: 'VPool',
    poolParams: ['veDAI-WBTC Earn Pool', 'veDAI-WBTC', Address.DAI],
    setup: { ...setup },
    rewards: { ...earnRewards, tokens: [Address.Vesper.vWBTC, Address.Vesper.VSP], growToken: Address.Vesper.vWBTC },
  },
}

module.exports = Object.freeze(PoolConfig)
