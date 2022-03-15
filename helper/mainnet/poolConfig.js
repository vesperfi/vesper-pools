'use strict'

const Address = require('./address')
const setup = { feeCollector: Address.FEE_COLLECTOR }

// VFR pools do not need have PoolRewards contract hence no rewards object should not set for VFR pools
const rewards = { contract: 'PoolRewards', tokens: [Address.VSP] }
// Earn pool will have extra data in 'rewards' object. Below is default value for 'rewards' object for Earn pools
const earnRewards = { contract: 'VesperEarnDrip', tokens: [Address.vaDAI, Address.VSP], growToken: Address.vaDAI }

const PoolConfig = {
  VDAI: {
    contractName: 'VPool',
    poolParams: ['vDAI Pool', 'vDAI', Address.DAI],
    setup: { ...setup }, // Shallow copy
    rewards: { ...rewards },
  },
  VADAI: {
    contractName: 'VPool',
    poolParams: ['vaDAI Pool', 'vaDAI', Address.DAI],
    setup: { ...setup },
    rewards: { ...rewards },
  },
  VAETH: {
    contractName: 'VETH',
    poolParams: ['vaETH Pool', 'vaETH', Address.WETH],
    setup: { ...setup },
    rewards: { ...rewards },
  },
  VAWBTC: {
    contractName: 'VPool',
    poolParams: ['vaWBTC Pool', 'vaWBTC', Address.WBTC],
    setup: { ...setup },
    rewards: { ...rewards },
  },
  VEETH_DAI: {
    contractName: 'VETH',
    poolParams: ['veETH-DAI Earn Pool', 'veETH-DAI', Address.WETH],
    setup: { ...setup },
    rewards: { ...earnRewards },
  },
  VEWBTC_DAI: {
    contractName: 'VPool',
    poolParams: ['veWBTC-DAI Earn Pool', 'veWBTC-DAI', Address.WBTC],
    setup: { ...setup },
    rewards: { ...earnRewards },
  },
  VELINK_DAI: {
    contractName: 'VPool',
    poolParams: ['veLINK-DAI Earn Pool', 'veLINK-DAI', Address.LINK],
    setup: { ...setup },
    rewards: { ...earnRewards },
  },
  VEDAI_WBTC: {
    contractName: 'VPool',
    poolParams: ['veDAI-WBTC Earn Pool', 'veDAI-WBTC', Address.DAI],
    setup: { ...setup },
    rewards: { ...earnRewards, tokens: [Address.vaWBTC, Address.VSP], growToken: Address.vaWBTC },
  },
  VEDAI_ETH: {
    contractName: 'VPool',
    poolParams: ['veDAI-ETH Earn Pool', 'veDAI-ETH', Address.DAI],
    setup: { ...setup },
    rewards: { ...earnRewards, tokens: [Address.vaETH, Address.VSP], growToken: Address.vaETH },
  },
  VEDAI_DPI: {
    contractName: 'VPool',
    poolParams: ['veDAI-DPI Earn Pool', 'veDAI-DPI', Address.DAI],
    setup: { ...setup },
    rewards: { ...earnRewards, tokens: [Address.vaDPI, Address.VSP], growToken: Address.vaDPI },
  },
  VEDAI_LINK: {
    contractName: 'VPool',
    poolParams: ['veDAI-LINK Earn Pool', 'veDAI-LINK', Address.DAI],
    setup: { ...setup },
    rewards: { ...earnRewards, tokens: [Address.vaLINK, Address.VSP], growToken: Address.vaLINK },
  },
  VEDAI_VSP: {
    contractName: 'VPool',
    poolParams: ['veDAI-VSP Earn Pool', 'veDAI-VSP', Address.DAI],
    setup: { ...setup },
    rewards: { ...earnRewards, tokens: [Address.vVSP], growToken: Address.vVSP },
  },
  VEDAI_SHIB: {
    contractName: 'VPool',
    poolParams: ['veDAI-SHIB Earn Pool', 'veDAI-SHIB', Address.DAI],
    setup: { ...setup },
    rewards: { contract: 'VesperEarnDrip', tokens: [Address.SHIB, Address.VSP] },
  },
  VEDAI_PUNK: {
    contractName: 'VPool',
    poolParams: ['veDAI-PUNK Earn Pool', 'veDAI-PUNK', Address.DAI],
    setup: { ...setup },
    rewards: { contract: 'VesperEarnDrip', tokens: [Address.PUNK, Address.VSP] },
  },
  VLINK: {
    contractName: 'VPool',
    poolParams: ['vLINK Pool', 'vLINK', Address.LINK],
    setup: { ...setup },
    rewards: { ...rewards },
  },
  VUNI: {
    contractName: 'VPool',
    poolParams: ['vUNI Pool', 'vUNI', Address.UNI],
    setup: { ...setup },
    rewards: { ...rewards },
  },
  VUSDC: {
    contractName: 'VPool',
    poolParams: ['vUSDC Pool', 'vUSDC', Address.USDC],
    setup: { ...setup },
    rewards: { ...rewards },
  },
  VAUSDC: {
    contractName: 'VPool',
    poolParams: ['vaUSDC Pool', 'vaUSDC', Address.USDC],
    setup: { ...setup },
    rewards: { ...rewards },
  },
  VUSDT: {
    contractName: 'VPool',
    poolParams: ['vUSDT Pool', 'vUSDT', Address.USDT],
    setup: { ...setup },
    rewards: { ...rewards },
  },
  VMIM: {
    contractName: 'VPool',
    poolParams: ['vMIM Pool', 'vMIM', Address.MIM],
    setup: { ...setup },
    rewards: { ...rewards },
  },
  VAFEI: {
    contractName: 'VPool',
    poolParams: ['vaFEI Pool', 'vaFEI', Address.FEI],
    setup: { ...setup },
    rewards: { ...rewards },
  },
  VAFRAX: {
    contractName: 'VPool',
    poolParams: ['vaFRAX Pool', 'vaFRAX', Address.FRAX],
    setup: { ...setup },
    rewards: { ...rewards },
  },
  VAALUSD: {
    contractName: 'VPool',
    poolParams: ['vaALUSD Pool', 'vaALUSD', Address.ALUSD],
    setup: { ...setup },
    rewards: { ...rewards },
  },
  VFRDAI: {
    Coverage: {
      contractName: 'VFRPool',
      deploymentName: 'VFRCoverageDAI',
      poolParams: ['vfrcDAI Pool', 'vfrcDAI', Address.DAI],
      setup: { ...setup },
    },
    Stable: {
      contractName: 'VFRStablePool',
      deploymentName: 'VFRStableDAI',
      poolParams: ['vfrsDAI Pool', 'vfrsDAI', Address.DAI],
      setup: { ...setup },
    },
  },
  VADPI: {
    contractName: 'VPool',
    poolParams: ['vaDPI Pool', 'vaDPI', Address.DPI],
    setup: { ...setup },
    rewards: { ...rewards },
  },
  VALINK: {
    contractName: 'VPool',
    poolParams: ['vaLINK Pool', 'vaLINK', Address.LINK],
    setup: { ...setup },
    rewards: { ...rewards },
  },
  VAMUSD: {
    contractName: 'VPool',
    poolParams: ['vaMUSD Pool', 'vaMUSD', Address.MUSD],
    setup: { ...setup },
    rewards: { ...rewards },
  },
}

module.exports = Object.freeze(PoolConfig)
