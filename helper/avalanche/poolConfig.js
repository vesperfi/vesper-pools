'use strict'

const Address = require('./address')

const setup = { addressListFactory: Address.ADDRESS_LIST_FACTORY, feeCollector: Address.FEE_COLLECTOR, withdrawFee: 60 }
const rewards = { contract: 'PoolRewards', tokens: [] }

const PoolConfig = {
  VDAI: {
    contractName: 'VPool',
    poolParams: ['vDAI Pool', 'vDAI', Address.DAI],
    setup: { ...setup }, // Shallow copy
    rewards: { ...rewards },
  },
}

module.exports = Object.freeze(PoolConfig)
