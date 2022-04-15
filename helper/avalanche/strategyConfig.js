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
  CrvA3PoolStrategyDAI: {
    contract: 'CrvA3PoolAvaxStrategy',
    type: StrategyTypes.CURVE,
    constructorArgs: {
      swapManager,
      collateralIdx: 0,
      strategyName: 'CrvA3PoolStrategyDAI',
    },
    config: { ...config, externalDepositFee: 100 },
    setup: { ...setup },
  },
  CrvA3PoolStrategyUSDC: {
    contract: 'CrvA3PoolAvaxStrategy',
    type: StrategyTypes.CURVE,
    constructorArgs: {
      swapManager,
      collateralIdx: 1,
      strategyName: 'CrvA3PoolStrategyUSDC',
    },
    config: { ...config, externalDepositFee: 100 },
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

  BenqiCompoundStrategyAvalancheDAI: {
    contract: 'CompoundMultiRewardAvalancheStrategy',
    type: StrategyTypes.COMPOUND,
    constructorArgs: {
      swapManager,
      comptroller: Address.Benqi.COMPTROLLER,
      rewardDistributor: Address.Benqi.REWARD_DISTRIBUTOR,
      rewardToken: Address.Benqi.QI,
      receiptToken: Address.Benqi.qiDAI,
      strategyName: 'BenqiCompoundStrategyAvalancheDAI',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },

  BenqiCompoundStrategyAvalancheWETH: {
    contract: 'CompoundMultiRewardAvalancheStrategy',
    type: StrategyTypes.COMPOUND,
    constructorArgs: {
      swapManager,
      comptroller: Address.Benqi.COMPTROLLER,
      rewardDistributor: Address.Benqi.REWARD_DISTRIBUTOR,
      rewardToken: Address.Benqi.QI,
      receiptToken: Address.Benqi.qiETH,
      strategyName: 'BenqiCompoundStrategyAvalancheWETH',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },

  BenqiCompoundStrategyAvalancheWBTC: {
    contract: 'CompoundMultiRewardAvalancheStrategy',
    type: StrategyTypes.COMPOUND,
    constructorArgs: {
      swapManager,
      comptroller: Address.Benqi.COMPTROLLER,
      rewardDistributor: Address.Benqi.REWARD_DISTRIBUTOR,
      rewardToken: Address.Benqi.QI,
      receiptToken: Address.Benqi.qiBTC,
      strategyName: 'BenqiCompoundStrategyAvalancheWBTC',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },

  BenqiCompoundStrategyAvalancheAVAX: {
    contract: 'BenqiCompoundMultiRewardAvalancheStrategyAVAX',
    type: StrategyTypes.COMPOUND,
    constructorArgs: {
      swapManager,
      comptroller: Address.Benqi.COMPTROLLER,
      rewardDistributor: Address.Benqi.REWARD_DISTRIBUTOR,
      rewardToken: Address.Benqi.QI,
      receiptToken: Address.Benqi.qiAVAX,
      strategyName: 'BenqiCompoundStrategyAvalancheAVAX',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },

  BenqiCompoundLeverageStrategyAvalancheUSDC: {
    contract: 'CompoundLeverageAvalancheStrategy',
    type: StrategyTypes.COMPOUND_LEVERAGE,
    constructorArgs: {
      swapManager,
      comptroller: Address.Benqi.COMPTROLLER,
      rewardDistributor: Address.Benqi.REWARD_DISTRIBUTOR,
      rewardToken: Address.Benqi.QI,
      aaveAddressProvider: Address.Aave.AddressProvider,
      receiptToken: Address.Benqi.qiUSDC,
      strategyName: 'BenqiCompoundLeverageStrategyAvalancheUSDC',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },

  BenqiCompoundLeverageStrategyAvalancheDAI: {
    contract: 'CompoundLeverageAvalancheStrategy',
    type: StrategyTypes.COMPOUND_LEVERAGE,
    constructorArgs: {
      swapManager,
      comptroller: Address.Benqi.COMPTROLLER,
      rewardDistributor: Address.Benqi.REWARD_DISTRIBUTOR,
      rewardToken: Address.Benqi.QI,
      aaveAddressProvider: Address.Aave.AddressProvider,
      receiptToken: Address.Benqi.qiDAI,
      strategyName: 'BenqiCompoundLeverageStrategyAvalancheDAI',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },

  BenqiCompoundLeverageStrategyAvalancheAVAX: {
    contract: 'BenqiCompoundLeverageAvalancheStrategyAVAX',
    type: StrategyTypes.COMPOUND_LEVERAGE,
    constructorArgs: {
      swapManager,
      comptroller: Address.Benqi.COMPTROLLER,
      rewardDistributor: Address.Benqi.REWARD_DISTRIBUTOR,
      rewardToken: Address.Benqi.QI,
      aaveAddressProvider: Address.Aave.AddressProvider,
      receiptToken: Address.Benqi.qiAVAX,
      strategyName: 'BenqiCompoundLeverageStrategyAvalancheAVAX',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },

  BenqiCompoundLeverageStrategyAvalancheWBTC: {
    contract: 'CompoundLeverageAvalancheStrategy',
    type: StrategyTypes.COMPOUND_LEVERAGE,
    constructorArgs: {
      swapManager,
      comptroller: Address.Benqi.COMPTROLLER,
      rewardDistributor: Address.Benqi.REWARD_DISTRIBUTOR,
      rewardToken: Address.Benqi.QI,
      aaveAddressProvider: Address.Aave.AddressProvider,
      receiptToken: Address.Benqi.qiBTC,
      strategyName: 'BenqiCompoundLeverageStrategyAvalancheWBTC',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },

  BenqiCompoundLeverageStrategyAvalancheWETH: {
    contract: 'CompoundLeverageAvalancheStrategy',
    type: StrategyTypes.COMPOUND_LEVERAGE,
    constructorArgs: {
      swapManager,
      comptroller: Address.Benqi.COMPTROLLER,
      rewardDistributor: Address.Benqi.REWARD_DISTRIBUTOR,
      rewardToken: Address.Benqi.QI,
      aaveAddressProvider: Address.Aave.AddressProvider,
      receiptToken: Address.Benqi.qiETH,
      strategyName: 'BenqiCompoundLeverageStrategyAvalancheWETH',
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
      strategyName: 'TraderJoeCompoundLeverageStrategyAvalancheWETH',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },

  TraderJoeCompoundLeverageStrategyAvalancheAVAX: {
    contract: 'CompoundLeverageAvalancheStrategy',
    type: StrategyTypes.COMPOUND_LEVERAGE,
    constructorArgs: {
      swapManager,
      comptroller: Address.TraderJoe.COMPTROLLER,
      rewardDistributor: Address.TraderJoe.REWARD_DISTRIBUTOR,
      rewardToken: Address.TraderJoe.JOE,
      aaveAddressProvider: Address.Aave.AddressProvider,
      receiptToken: Address.TraderJoe.jAVAX,
      strategyName: 'TraderJoeCompoundLeverageStrategyAvalancheAVAX',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },

  TraderJoeCompoundLeverageStrategyAvalancheDAI: {
    contract: 'CompoundLeverageAvalancheStrategy',
    type: StrategyTypes.COMPOUND_LEVERAGE,
    constructorArgs: {
      swapManager,
      comptroller: Address.TraderJoe.COMPTROLLER,
      rewardDistributor: Address.TraderJoe.REWARD_DISTRIBUTOR,
      rewardToken: Address.TraderJoe.JOE,
      aaveAddressProvider: Address.Aave.AddressProvider,
      receiptToken: Address.TraderJoe.jDAI,
      strategyName: 'TraderJoeCompoundLeverageStrategyAvalancheDAI',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },

  TraderJoeCompoundLeverageStrategyAvalancheUSDC: {
    contract: 'CompoundLeverageAvalancheStrategy',
    type: StrategyTypes.COMPOUND_LEVERAGE,
    constructorArgs: {
      swapManager,
      comptroller: Address.TraderJoe.COMPTROLLER,
      rewardDistributor: Address.TraderJoe.REWARD_DISTRIBUTOR,
      rewardToken: Address.TraderJoe.JOE,
      aaveAddressProvider: Address.Aave.AddressProvider,
      receiptToken: Address.TraderJoe.jUSDC,
      strategyName: 'TraderJoeCompoundLeverageStrategyAvalancheUSDC',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },

  TraderJoeCompoundLeverageStrategyAvalancheWBTC: {
    contract: 'CompoundLeverageAvalancheStrategy',
    type: StrategyTypes.COMPOUND_LEVERAGE,
    constructorArgs: {
      swapManager,
      comptroller: Address.TraderJoe.COMPTROLLER,
      rewardDistributor: Address.TraderJoe.REWARD_DISTRIBUTOR,
      rewardToken: Address.TraderJoe.JOE,
      aaveAddressProvider: Address.Aave.AddressProvider,
      receiptToken: Address.TraderJoe.jWBTC,
      strategyName: 'TraderJoeCompoundLeverageStrategyAvalancheWBTC',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },

  AlphaLendAvalancheStrategyDAI: {
    contract: 'AlphaLendAvalancheStrategy',
    type: StrategyTypes.ALPHA_LEND,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Alpha.ibDAIv2,
      strategyName: 'AlphaLendAvalancheStrategyDAI',
    },
    config: { ...config },
    setup: { ...setup },
  },

  AlphaLendAvalancheStrategyWETH: {
    contract: 'AlphaLendAvalancheStrategy',
    type: StrategyTypes.ALPHA_LEND,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Alpha.ibWETHv2,
      strategyName: 'AlphaLendAvalancheStrategyWETH',
    },
    config: { ...config },
    setup: { ...setup },
  },

  AlphaLendAvalancheStrategyUSDC: {
    contract: 'AlphaLendAvalancheStrategy',
    type: StrategyTypes.ALPHA_LEND,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Alpha.ibUSDCv2,
      strategyName: 'AlphaLendAvalancheStrategyUSDC',
    },
    config: { ...config },
    setup: { ...setup },
  },

  AlphaLendAvalancheStrategyWBTC: {
    contract: 'AlphaLendAvalancheStrategy',
    type: StrategyTypes.ALPHA_LEND,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Alpha.ibWBTCv2,
      strategyName: 'AlphaLendAvalancheStrategyWBTC',
    },
    config: { ...config },
    setup: { ...setup },
  },

  AlphaLendAvalancheStrategyAVAX: {
    contract: 'AlphaLendAvalancheStrategyAVAX',
    type: StrategyTypes.ALPHA_LEND,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Alpha.ibAVAXv2,
      strategyName: 'AlphaLendAvalancheStrategyAVAX',
    },
    config: { ...config },
    setup: { ...setup },
  },
}

module.exports = Object.freeze(StrategyConfig)
