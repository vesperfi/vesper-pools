'use strict'

const { ethers } = require('hardhat')
const Address = require('./address')
const StrategyTypes = require('../../test/utils/strategyTypes')

const swapManager = Address.SWAP_MANAGER
const interestFee = '2000' // 20%
const config = {
  interestFee,
  debtRatio: 0,
  debtRate: ethers.utils.parseEther('1000000').toString(),
  externalDepositFee: 0,
}
const setup = {
  feeCollector: Address.FEE_COLLECTOR,
  keepers: [Address.KEEPER],
}

// TODO update setup to remove strategy type, once done remove type from heres too
const StrategyConfig = {
  AaveStrategyAvalancheDAI: {
    contract: 'AaveStrategyAvalanche',
    type: StrategyTypes.AAVE,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Aave.avDAI,
      strategyName: 'AaveStrategyAvalancheDAI',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },
  AaveStrategyAvalancheWETH: {
    contract: 'AaveStrategyAvalanche',
    type: StrategyTypes.AAVE,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Aave.avWETH,
      strategyName: 'AaveStrategyAvalancheWETH',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },
  AaveStrategyAvalancheWBTC: {
    contract: 'AaveStrategyAvalanche',
    type: StrategyTypes.AAVE,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Aave.avWBTC,
      strategyName: 'AaveStrategyAvalancheWBTC',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },
  AaveStrategyAvalancheAVAX: {
    contract: 'AaveStrategyAvalanche',
    type: StrategyTypes.AAVE,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Aave.avWAVAX,
      strategyName: 'AaveStrategyAvalancheAVAX',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },
  AaveStrategyAvalancheUSDC: {
    contract: 'AaveStrategyAvalanche',
    type: StrategyTypes.AAVE,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Aave.avUSDC,
      strategyName: 'AaveStrategyAvalancheUSDC',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },
  TraderJoeCompoundStrategyAvalancheUSDC: {
    contract: 'CompoundMultiRewardAvalancheStrategy',
    type: StrategyTypes.TRADER_JOE,
    constructorArgs: {
      swapManager,
      comptroller: Address.TraderJoe.COMPTROLLER,
      rewardDistributor: Address.TraderJoe.REWARD_DISTRIBUTOR,
      rewardToken: Address.TraderJoe.JOE,
      receiptToken: Address.TraderJoe.jUSDC,
      strategyName: 'TraderJoeCompoundStrategyAvalancheUSDC',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },

  TraderJoeCompoundStrategyAvalancheAVAX: {
    contract: 'CompoundMultiRewardAvalancheStrategy',
    type: StrategyTypes.TRADER_JOE,
    constructorArgs: {
      swapManager,
      comptroller: Address.TraderJoe.COMPTROLLER,
      rewardDistributor: Address.TraderJoe.REWARD_DISTRIBUTOR,
      rewardToken: Address.TraderJoe.JOE,
      receiptToken: Address.TraderJoe.jAVAX,
      strategyName: 'TraderJoeCompoundStrategyAvalancheAVAX',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },

  TraderJoeCompoundStrategyAvalancheWETH: {
    contract: 'CompoundMultiRewardAvalancheStrategy',
    type: StrategyTypes.TRADER_JOE,
    constructorArgs: {
      swapManager,
      comptroller: Address.TraderJoe.COMPTROLLER,
      rewardDistributor: Address.TraderJoe.REWARD_DISTRIBUTOR,
      rewardToken: Address.TraderJoe.JOE,
      receiptToken: Address.TraderJoe.jWETH,
      strategyName: 'TraderJoeCompoundStrategyAvalancheWETH',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },

  TraderJoeCompoundStrategyAvalancheDAI: {
    contract: 'CompoundMultiRewardAvalancheStrategy',
    type: StrategyTypes.TRADER_JOE,
    constructorArgs: {
      swapManager,
      comptroller: Address.TraderJoe.COMPTROLLER,
      rewardDistributor: Address.TraderJoe.REWARD_DISTRIBUTOR,
      rewardToken: Address.TraderJoe.JOE,
      receiptToken: Address.TraderJoe.jDAI,
      strategyName: 'TraderJoeCompoundStrategyAvalancheDAI',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },

  TraderJoeCompoundStrategyAvalancheWBTC: {
    contract: 'CompoundMultiRewardAvalancheStrategy',
    type: StrategyTypes.TRADER_JOE,
    constructorArgs: {
      swapManager,
      comptroller: Address.TraderJoe.COMPTROLLER,
      rewardDistributor: Address.TraderJoe.REWARD_DISTRIBUTOR,
      rewardToken: Address.TraderJoe.JOE,
      receiptToken: Address.TraderJoe.jWBTC,
      strategyName: 'TraderJoeCompoundStrategyAvalancheWBTC',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },

  BenqiCompoundStrategyAvalancheUSDC: {
    contract: 'CompoundMultiRewardAvalancheStrategy',
    type: StrategyTypes.COMPOUND,
    constructorArgs: {
      swapManager,
      comptroller: Address.Benqi.COMPTROLLER,
      rewardDistributor: Address.Benqi.REWARD_DISTRIBUTOR,
      rewardToken: Address.Benqi.QI,
      receiptToken: Address.Benqi.qiUSDC,
      strategyName: 'BenqiCompoundStrategyAvalancheUSDC',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },

  TraderJoeCompoundLeverageStrategyAvalancheWETH: {
    contract: 'CompoundLeverageAvalancheStrategy',
    type: StrategyTypes.COMPOUND_LEVERAGE,
    constructorArgs: {
      swapManager,
      comptroller: Address.TraderJoe.COMPTROLLER,
      rewardDistributor: Address.TraderJoe.REWARD_DISTRIBUTOR,
      rewardToken: Address.TraderJoe.JOE,
      aaveAddressProvider: Address.Aave.AddressProvider,
      receiptToken: Address.TraderJoe.jWETH,
      strategyName: 'TraderJoeCompoundStrategyAvalancheWETH',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },
}

module.exports = Object.freeze(StrategyConfig)
