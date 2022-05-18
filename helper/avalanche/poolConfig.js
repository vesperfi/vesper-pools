'use strict'

const Address = require('./address')

const setup = { universalFee: 200 }
const rewards = { contract: 'PoolRewards', tokens: [Address.Vesper.VSP] }

const PoolConfig = {
  VADAIe: {
    contractName: 'VPool',
    poolParams: ['vaDAIe Pool', 'vaDAIe', Address.DAIe],
    setup: { ...setup }, // Shallow copy
    rewards: { ...rewards },
  },
  VDAIe: {
    contractName: 'VPool',
    poolParams: ['vaDAIe Pool', 'vaDAIe', Address.DAIe],
    setup: { ...setup }, // Shallow copy
    rewards: { ...rewards },
  },
  VAWETHe: {
    contractName: 'VPool',
    poolParams: ['vaWETHe Pool', 'vaWETHe', Address.WETHe],
    setup: { ...setup }, // Shallow copy
    rewards: { ...rewards },
  },
  VAWBTCe: {
    contractName: 'VPool',
    poolParams: ['vaWBTCe Pool', 'vaWBTCe', Address.WBTCe],
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
    poolParams: ['vaUSDCe Pool', 'vaUSDCe', Address.USDCe],
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
}

module.exports = Object.freeze(PoolConfig)
