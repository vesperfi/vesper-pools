'use strict'

const Address = require('./address')

const setup = { universalFee: 200 }
const rewards = { contract: 'PoolRewards', tokens: [Address.Vesper.VSP] }

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
    rewards: { ...rewards },
  },
  VAWBTC: {
    contractName: 'VPool',
    poolParams: ['vaWBTC Pool', 'vaWBTC', Address.WBTC],
    setup: { ...setup }, // Shallow copy
    rewards: { ...rewards },
  },
  VAAVAX: {
    contractName: 'VETH',
    poolParams: ['vaAVAX Pool', 'vaAVAX', Address.NATIVE_TOKEN],
    setup: { ...setup }, // Shallow copy
    rewards: { ...rewards },
  },
  VAUSDCe: {
    contractName: 'VPool',
    poolParams: ['vaUSDC.e Pool', 'vaUSDC.e', Address.USDCe],
    setup: { ...setup }, // Shallow copy
    rewards: { ...rewards },
  },
  VAUSDC: {
    contractName: 'VPool',
    poolParams: ['vaUSDC Pool', 'vaUSDC', Address.USDC],
    setup: { ...setup }, // Shallow copy
    rewards: { ...rewards },
  },
  VAQI: {
    contractName: 'VPool',
    poolParams: ['vaQI Pool', 'vaQI', Address.Benqi.QI],
    setup: { ...setup }, // Shallow copy
    rewards: { ...rewards },
  },
  VUSDCe: {
    contractName: 'VPool',
    poolParams: ['vUSDC.e Pool', 'vUSDC.e', Address.USDCe],
    setup: { ...setup }, // Shallow copy
    rewards: { ...rewards },
  },
}

module.exports = Object.freeze(PoolConfig)
