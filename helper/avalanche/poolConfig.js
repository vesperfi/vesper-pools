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
}

module.exports = Object.freeze(PoolConfig)
