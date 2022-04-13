'use strict'

const Address = require('./address')

const setup = { feeCollector: Address.FEE_COLLECTOR, withdrawFee: 60 }
const rewards = { contract: 'PoolRewards', tokens: [Address.NATIVE_TOKEN] }

const PoolConfig = {
  VADAI: {
    contractName: 'VPool',
    poolParams: ['vaDAI Pool', 'vaDAI', Address.DAI],
    setup: { ...setup }, // Shallow copy
    rewards: { ...rewards },
  },
  VDAI: {
    contractName: 'VPool',
    poolParams: ['vaDAI Pool', 'vaDAI', Address.DAI],
    setup: { ...setup }, // Shallow copy
    rewards: { ...rewards },
  },
  VAWETH: {
    contractName: 'VPool',
    poolParams: ['vaWETH Pool', 'vaWETH', Address.WETH],
    setup: { ...setup }, // Shallow copy
    rewards: { contract: 'PoolRewards', tokens: [] }, // no rewards
  },
  VAWBTC: {
    contractName: 'VPool',
    poolParams: ['vaWBTC Pool', 'vaWBTC', Address.WBTC],
    setup: { ...setup }, // Shallow copy
    rewards: { contract: 'PoolRewards', tokens: [] }, // no rewards
  },
  VAAVAX: {
    contractName: 'VETH',
    poolParams: ['vaAVAX Pool', 'vaAVAX', Address.NATIVE_TOKEN],
    setup: { ...setup }, // Shallow copy
    rewards: { contract: 'PoolRewards', tokens: [] }, // no rewards
  },
  VAUSDC: {
    contractName: 'VPool',
    poolParams: ['vaUSDC Pool', 'vaUSDC', Address.USDC],
    setup: { ...setup }, // Shallow copy
    rewards: { contract: 'PoolRewards', tokens: [] }, // no rewards
  },
  VUSDC: {
    contractName: 'VPool',
    poolParams: ['vUSDC Pool', 'vUSDC', Address.USDC],
    setup: { ...setup }, // Shallow copy
    rewards: { contract: 'PoolRewards', tokens: [] }, // no rewards
  },
}

module.exports = Object.freeze(PoolConfig)
