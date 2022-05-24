'use strict'

const Address = require('./address')
const StrategyTypes = require('../../test/utils/strategyTypes')

const swapManager = Address.Vesper.SWAP_MANAGER
const config = { debtRatio: 0, externalDepositFee: 0 }
const setup = {
  feeCollector: Address.Vesper.FEE_COLLECTOR,
  keepers: [Address.Vesper.KEEPER, Address.Vesper.MP, Address.Vesper.JCV],
}

// TODO update setup to remove strategy type, once done remove type from heres too
const StrategyConfig = {
  AaveStrategyDAIe: {
    contract: 'AaveStrategyAvalanche',
    type: StrategyTypes.AAVE,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Aave.avDAI,
      strategyName: 'AaveStrategyDAIe',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },
  AaveStrategyWETHe: {
    contract: 'AaveStrategyAvalanche',
    type: StrategyTypes.AAVE,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Aave.avWETH,
      strategyName: 'AaveStrategyWETHe',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },
  AaveStrategyWBTCe: {
    contract: 'AaveStrategyAvalanche',
    type: StrategyTypes.AAVE,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Aave.avWBTC,
      strategyName: 'AaveStrategyWBTCe',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },
  AaveStrategyAVAX: {
    contract: 'AaveStrategyAvalanche',
    type: StrategyTypes.AAVE,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Aave.avWAVAX,
      strategyName: 'AaveStrategyAVAX',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },
  AaveStrategyUSDCe: {
    contract: 'AaveStrategyAvalanche',
    type: StrategyTypes.AAVE,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Aave.avUSDC,
      strategyName: 'AaveStrategyUSDCe',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },
  AaveLeverageStrategyAVAX: {
    contract: 'AaveLeverageAvalancheStrategy',
    type: StrategyTypes.AAVE_LEVERAGE,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Aave.avWAVAX,
      strategyName: 'AaveLeverageStrategyAVAX',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },
  CrvA3PoolStrategyDAIe: {
    contract: 'CrvA3PoolAvaxStrategy',
    type: StrategyTypes.CURVE,
    constructorArgs: {
      swapManager,
      collateralIdx: 0,
      strategyName: 'CrvA3PoolStrategyDAIe',
    },
    config: { ...config, externalDepositFee: 0 },
    setup: { ...setup },
  },
  CrvA3PoolStrategyUSDCe: {
    contract: 'CrvA3PoolAvaxStrategy',
    type: StrategyTypes.CURVE,
    constructorArgs: {
      swapManager,
      collateralIdx: 1,
      strategyName: 'CrvA3PoolStrategyUSDCe',
    },
    config: { ...config, externalDepositFee: 0 },
    setup: { ...setup },
  },
  TraderJoeStrategyUSDCe: {
    contract: 'CompoundMultiRewardAvalancheStrategy',
    type: StrategyTypes.TRADER_JOE,
    constructorArgs: {
      swapManager,
      comptroller: Address.TraderJoe.COMPTROLLER,
      rewardDistributor: Address.TraderJoe.REWARD_DISTRIBUTOR,
      rewardToken: Address.TraderJoe.JOE,
      receiptToken: Address.TraderJoe.jUSDC,
      strategyName: 'TraderJoeStrategyUSDCe',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },

  TraderJoeStrategyUSDC: {
    contract: 'CompoundMultiRewardAvalancheStrategy',
    type: StrategyTypes.TRADER_JOE,
    constructorArgs: {
      swapManager,
      comptroller: Address.TraderJoe.COMPTROLLER,
      rewardDistributor: Address.TraderJoe.REWARD_DISTRIBUTOR,
      rewardToken: Address.TraderJoe.JOE,
      receiptToken: Address.TraderJoe.jUSDCNative,
      strategyName: 'TraderJoeStrategyUSDC',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },

  TraderJoeStrategyAVAX: {
    contract: 'CompoundMultiRewardAvalancheStrategy',
    type: StrategyTypes.TRADER_JOE,
    constructorArgs: {
      swapManager,
      comptroller: Address.TraderJoe.COMPTROLLER,
      rewardDistributor: Address.TraderJoe.REWARD_DISTRIBUTOR,
      rewardToken: Address.TraderJoe.JOE,
      receiptToken: Address.TraderJoe.jAVAX,
      strategyName: 'TraderJoeStrategyAVAX',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },

  TraderJoeStrategyWETHe: {
    contract: 'CompoundMultiRewardAvalancheStrategy',
    type: StrategyTypes.TRADER_JOE,
    constructorArgs: {
      swapManager,
      comptroller: Address.TraderJoe.COMPTROLLER,
      rewardDistributor: Address.TraderJoe.REWARD_DISTRIBUTOR,
      rewardToken: Address.TraderJoe.JOE,
      receiptToken: Address.TraderJoe.jWETH,
      strategyName: 'TraderJoeStrategyWETHe',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },

  TraderJoeStrategyDAIe: {
    contract: 'CompoundMultiRewardAvalancheStrategy',
    type: StrategyTypes.TRADER_JOE,
    constructorArgs: {
      swapManager,
      comptroller: Address.TraderJoe.COMPTROLLER,
      rewardDistributor: Address.TraderJoe.REWARD_DISTRIBUTOR,
      rewardToken: Address.TraderJoe.JOE,
      receiptToken: Address.TraderJoe.jDAI,
      strategyName: 'TraderJoeStrategyDAIe',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },

  TraderJoeStrategyWBTCe: {
    contract: 'CompoundMultiRewardAvalancheStrategy',
    type: StrategyTypes.TRADER_JOE,
    constructorArgs: {
      swapManager,
      comptroller: Address.TraderJoe.COMPTROLLER,
      rewardDistributor: Address.TraderJoe.REWARD_DISTRIBUTOR,
      rewardToken: Address.TraderJoe.JOE,
      receiptToken: Address.TraderJoe.jWBTC,
      strategyName: 'TraderJoeStrategyWBTCe',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },

  BenqiStrategyUSDCe: {
    contract: 'CompoundMultiRewardAvalancheStrategy',
    type: StrategyTypes.COMPOUND,
    constructorArgs: {
      swapManager,
      comptroller: Address.Benqi.COMPTROLLER,
      rewardDistributor: Address.Benqi.REWARD_DISTRIBUTOR,
      rewardToken: Address.Benqi.QI,
      receiptToken: Address.Benqi.qiUSDC,
      strategyName: 'BenqiStrategyUSDCe',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },
  BenqiStrategyDAIe: {
    contract: 'CompoundMultiRewardAvalancheStrategy',
    type: StrategyTypes.COMPOUND,
    constructorArgs: {
      swapManager,
      comptroller: Address.Benqi.COMPTROLLER,
      rewardDistributor: Address.Benqi.REWARD_DISTRIBUTOR,
      rewardToken: Address.Benqi.QI,
      receiptToken: Address.Benqi.qiDAI,
      strategyName: 'BenqiStrategyDAIe',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },
  BenqiStrategyWETHe: {
    contract: 'CompoundMultiRewardAvalancheStrategy',
    type: StrategyTypes.COMPOUND,
    constructorArgs: {
      swapManager,
      comptroller: Address.Benqi.COMPTROLLER,
      rewardDistributor: Address.Benqi.REWARD_DISTRIBUTOR,
      rewardToken: Address.Benqi.QI,
      receiptToken: Address.Benqi.qiETH,
      strategyName: 'BenqiStrategyWETHe',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },

  BenqiStrategyWBTCe: {
    contract: 'CompoundMultiRewardAvalancheStrategy',
    type: StrategyTypes.COMPOUND,
    constructorArgs: {
      swapManager,
      comptroller: Address.Benqi.COMPTROLLER,
      rewardDistributor: Address.Benqi.REWARD_DISTRIBUTOR,
      rewardToken: Address.Benqi.QI,
      receiptToken: Address.Benqi.qiBTC,
      strategyName: 'BenqiStrategyWBTCe',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },

  BenqiStrategyUSDC: {
    contract: 'CompoundMultiRewardAvalancheStrategy',
    type: StrategyTypes.COMPOUND,
    constructorArgs: {
      swapManager,
      comptroller: Address.Benqi.COMPTROLLER,
      rewardDistributor: Address.Benqi.REWARD_DISTRIBUTOR,
      rewardToken: Address.Benqi.QI,
      receiptToken: Address.Benqi.qiUSDCn,
      strategyName: 'BenqiStrategyUSDC',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },

  BenqiStrategyAVAX: {
    contract: 'BenqiCompoundMultiRewardAvalancheStrategyAVAX',
    type: StrategyTypes.COMPOUND,
    constructorArgs: {
      swapManager,
      comptroller: Address.Benqi.COMPTROLLER,
      rewardDistributor: Address.Benqi.REWARD_DISTRIBUTOR,
      rewardToken: Address.Benqi.QI,
      receiptToken: Address.Benqi.qiAVAX,
      strategyName: 'BenqiStrategyAVAX',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },

  BenqiStrategyQI: {
    contract: 'CompoundMultiRewardAvalancheStrategy',
    type: StrategyTypes.COMPOUND,
    constructorArgs: {
      swapManager,
      comptroller: Address.Benqi.COMPTROLLER,
      rewardDistributor: Address.Benqi.REWARD_DISTRIBUTOR,
      rewardToken: Address.Benqi.QI,
      receiptToken: Address.Benqi.qiQI,
      strategyName: 'BenqiStrategyQI',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },

  BenqiLeverageStrategyUSDC: {
    contract: 'BenqiLeverageStrategy',
    type: StrategyTypes.COMPOUND_LEVERAGE,
    constructorArgs: {
      swapManager,
      comptroller: Address.Benqi.COMPTROLLER,
      rewardDistributor: Address.Benqi.REWARD_DISTRIBUTOR,
      rewardToken: Address.Benqi.QI,
      aaveAddressProvider: Address.Aave.AddressProvider,
      receiptToken: Address.Benqi.qiUSDCn,
      strategyName: 'BenqiLeverageStrategyUSDC',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },

  BenqiLeverageStrategyUSDCe: {
    contract: 'BenqiLeverageStrategy',
    type: StrategyTypes.COMPOUND_LEVERAGE,
    constructorArgs: {
      swapManager,
      comptroller: Address.Benqi.COMPTROLLER,
      rewardDistributor: Address.Benqi.REWARD_DISTRIBUTOR,
      rewardToken: Address.Benqi.QI,
      aaveAddressProvider: Address.Aave.AddressProvider,
      receiptToken: Address.Benqi.qiUSDC,
      strategyName: 'BenqiLeverageStrategyUSDCe',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },

  BenqiLeverageStrategyDAIe: {
    contract: 'BenqiLeverageStrategy',
    type: StrategyTypes.COMPOUND_LEVERAGE,
    constructorArgs: {
      swapManager,
      comptroller: Address.Benqi.COMPTROLLER,
      rewardDistributor: Address.Benqi.REWARD_DISTRIBUTOR,
      rewardToken: Address.Benqi.QI,
      aaveAddressProvider: Address.Aave.AddressProvider,
      receiptToken: Address.Benqi.qiDAI,
      strategyName: 'BenqiLeverageStrategyDAIe',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },

  BenqiLeverageStrategyAVAX: {
    contract: 'BenqiLeverageStrategyAVAX',
    type: StrategyTypes.COMPOUND_LEVERAGE,
    constructorArgs: {
      swapManager,
      comptroller: Address.Benqi.COMPTROLLER,
      rewardDistributor: Address.Benqi.REWARD_DISTRIBUTOR,
      rewardToken: Address.Benqi.QI,
      aaveAddressProvider: Address.Aave.AddressProvider,
      receiptToken: Address.Benqi.qiAVAX,
      strategyName: 'BenqiLeverageStrategyAVAX',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },

  BenqiLeverageStrategyWBTCe: {
    contract: 'BenqiLeverageStrategy',
    type: StrategyTypes.COMPOUND_LEVERAGE,
    constructorArgs: {
      swapManager,
      comptroller: Address.Benqi.COMPTROLLER,
      rewardDistributor: Address.Benqi.REWARD_DISTRIBUTOR,
      rewardToken: Address.Benqi.QI,
      aaveAddressProvider: Address.Aave.AddressProvider,
      receiptToken: Address.Benqi.qiBTC,
      strategyName: 'BenqiLeverageStrategyWBTCe',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },

  BenqiLeverageStrategyWETHe: {
    contract: 'BenqiLeverageStrategy',
    type: StrategyTypes.COMPOUND_LEVERAGE,
    constructorArgs: {
      swapManager,
      comptroller: Address.Benqi.COMPTROLLER,
      rewardDistributor: Address.Benqi.REWARD_DISTRIBUTOR,
      rewardToken: Address.Benqi.QI,
      aaveAddressProvider: Address.Aave.AddressProvider,
      receiptToken: Address.Benqi.qiETH,
      strategyName: 'BenqiLeverageStrategyWETHe',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },

  TraderJoeLeverageStrategyWETHe: {
    contract: 'TraderJoeLeverageStrategy',
    type: StrategyTypes.COMPOUND_LEVERAGE,
    constructorArgs: {
      swapManager,
      comptroller: Address.TraderJoe.COMPTROLLER,
      rewardDistributor: Address.TraderJoe.REWARD_DISTRIBUTOR,
      rewardToken: Address.TraderJoe.JOE,
      aaveAddressProvider: Address.Aave.AddressProvider,
      receiptToken: Address.TraderJoe.jWETH,
      strategyName: 'TraderJoeLeverageStrategyWETHe',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },

  TraderJoeLeverageStrategyAVAX: {
    contract: 'TraderJoeLeverageStrategy',
    type: StrategyTypes.COMPOUND_LEVERAGE,
    constructorArgs: {
      swapManager,
      comptroller: Address.TraderJoe.COMPTROLLER,
      rewardDistributor: Address.TraderJoe.REWARD_DISTRIBUTOR,
      rewardToken: Address.TraderJoe.JOE,
      aaveAddressProvider: Address.Aave.AddressProvider,
      receiptToken: Address.TraderJoe.jAVAX,
      strategyName: 'TraderJoeLeverageStrategyAVAX',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },

  TraderJoeLeverageStrategyDAIe: {
    contract: 'TraderJoeLeverageStrategy',
    type: StrategyTypes.COMPOUND_LEVERAGE,
    constructorArgs: {
      swapManager,
      comptroller: Address.TraderJoe.COMPTROLLER,
      rewardDistributor: Address.TraderJoe.REWARD_DISTRIBUTOR,
      rewardToken: Address.TraderJoe.JOE,
      aaveAddressProvider: Address.Aave.AddressProvider,
      receiptToken: Address.TraderJoe.jDAI,
      strategyName: 'TraderJoeLeverageStrategyDAIe',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },

  TraderJoeLeverageStrategyUSDCe: {
    contract: 'TraderJoeLeverageStrategy',
    type: StrategyTypes.COMPOUND_LEVERAGE,
    constructorArgs: {
      swapManager,
      comptroller: Address.TraderJoe.COMPTROLLER,
      rewardDistributor: Address.TraderJoe.REWARD_DISTRIBUTOR,
      rewardToken: Address.TraderJoe.JOE,
      aaveAddressProvider: Address.Aave.AddressProvider,
      receiptToken: Address.TraderJoe.jUSDC,
      strategyName: 'TraderJoeLeverageStrategyUSDCe',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },

  TraderJoeLeverageStrategyUSDC: {
    contract: 'TraderJoeLeverageStrategy',
    type: StrategyTypes.COMPOUND_LEVERAGE,
    constructorArgs: {
      swapManager,
      comptroller: Address.TraderJoe.COMPTROLLER,
      rewardDistributor: Address.TraderJoe.REWARD_DISTRIBUTOR,
      rewardToken: Address.TraderJoe.JOE,
      aaveAddressProvider: Address.Aave.AddressProvider,
      receiptToken: Address.TraderJoe.jUSDCNative,
      strategyName: 'TraderJoeLeverageStrategyUSDC',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },

  TraderJoeLeverageStrategyWBTCe: {
    contract: 'TraderJoeLeverageStrategy',
    type: StrategyTypes.COMPOUND_LEVERAGE,
    constructorArgs: {
      swapManager,
      comptroller: Address.TraderJoe.COMPTROLLER,
      rewardDistributor: Address.TraderJoe.REWARD_DISTRIBUTOR,
      rewardToken: Address.TraderJoe.JOE,
      aaveAddressProvider: Address.Aave.AddressProvider,
      receiptToken: Address.TraderJoe.jWBTC,
      strategyName: 'TraderJoeLeverageStrategyWBTCe',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },

  AlphaLendStrategyDAIe: {
    contract: 'AlphaLendAvalancheStrategy',
    type: StrategyTypes.ALPHA_LEND,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Alpha.ibDAIev2,
      strategyName: 'AlphaLendStrategyDAIe',
    },
    config: { ...config },
    setup: { ...setup },
  },

  AlphaLendStrategyWETHe: {
    contract: 'AlphaLendAvalancheStrategy',
    type: StrategyTypes.ALPHA_LEND,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Alpha.ibWETHev2,
      strategyName: 'AlphaLendStrategyWETHe',
    },
    config: { ...config },
    setup: { ...setup },
  },

  AlphaLendStrategyUSDCe: {
    contract: 'AlphaLendAvalancheStrategy',
    type: StrategyTypes.ALPHA_LEND,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Alpha.ibUSDCev2,
      strategyName: 'AlphaLendStrategyUSDCe',
    },
    config: { ...config },
    setup: { ...setup },
  },

  AlphaLendStrategyUSDC: {
    contract: 'AlphaLendAvalancheStrategy',
    type: StrategyTypes.ALPHA_LEND,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Alpha.ibUSDCv2,
      strategyName: 'AlphaLendStrategyUSDC',
    },
    config: { ...config },
    setup: { ...setup },
  },

  AlphaLendStrategyWBTCe: {
    contract: 'AlphaLendAvalancheStrategy',
    type: StrategyTypes.ALPHA_LEND,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Alpha.ibWBTCev2,
      strategyName: 'AlphaLendStrategyWBTCe',
    },
    config: { ...config },
    setup: { ...setup },
  },

  AlphaLendStrategyAVAX: {
    contract: 'AlphaLendAvalancheStrategyAVAX',
    type: StrategyTypes.ALPHA_LEND,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Alpha.ibAVAXv2,
      strategyName: 'AlphaLendStrategyAVAX',
    },
    config: { ...config },
    setup: { ...setup },
  },

  VesperBenqiXYStrategyWBTCe: {
    contract: 'VesperBenqiXYStrategy',
    type: StrategyTypes.VESPER_COMPOUND_XY,
    constructorArgs: {
      swapManager,
      comptroller: Address.Benqi.COMPTROLLER,
      rewardDistributor: Address.Benqi.REWARD_DISTRIBUTOR,
      rewardToken: Address.Benqi.QI,
      receiptToken: Address.Benqi.qiBTC,
      borrowCToken: Address.Benqi.qiETH,
      vPool: Address.Vesper.vaWETHe,
      vsp: Address.Vesper.VSP,
      strategyName: 'VesperBenqiXYStrategyWBTCe',
    },
    config: { ...config },
    setup: { ...setup },
  },

  VesperTraderJoeXYStrategyAVAX: {
    contract: 'VesperTraderJoeXYStrategy',
    type: StrategyTypes.VESPER_COMPOUND_XY,
    constructorArgs: {
      swapManager,
      comptroller: Address.TraderJoe.COMPTROLLER,
      rewardDistributor: Address.TraderJoe.REWARD_DISTRIBUTOR,
      rewardToken: Address.TraderJoe.JOE,
      receiptToken: Address.TraderJoe.jAVAX,
      borrowCToken: Address.TraderJoe.jWETH,
      vPool: Address.Vesper.vaWETHe,
      vsp: Address.Vesper.VSP,
      strategyName: 'VesperTraderJoeXYStrategyAVAX',
    },
    config: { ...config },
    setup: { ...setup },
  },
  VesperTraderJoeXYStrategyWBTC_WETHe: {
    contract: 'VesperTraderJoeXYStrategy',
    type: StrategyTypes.VESPER_COMPOUND_XY,
    constructorArgs: {
      swapManager,
      comptroller: Address.TraderJoe.COMPTROLLER,
      rewardDistributor: Address.TraderJoe.REWARD_DISTRIBUTOR,
      rewardToken: Address.TraderJoe.JOE,
      receiptToken: Address.TraderJoe.jWBTC,
      borrowCToken: Address.TraderJoe.jWETH,
      vPool: Address.Vesper.vaWETHe,
      vsp: Address.Vesper.VSP,
      strategyName: 'VesperTraderJoeXYStrategy',
    },
    config: { ...config },
    setup: { ...setup },
  },
  VesperTraderJoeXYStrategyWBTC_USDCe: {
    contract: 'VesperTraderJoeXYStrategy',
    type: StrategyTypes.VESPER_COMPOUND_XY,
    constructorArgs: {
      swapManager,
      comptroller: Address.TraderJoe.COMPTROLLER,
      rewardDistributor: Address.TraderJoe.REWARD_DISTRIBUTOR,
      rewardToken: Address.TraderJoe.JOE,
      receiptToken: Address.TraderJoe.jWBTC,
      borrowCToken: Address.TraderJoe.jUSDC,
      vPool: Address.Vesper.vaUSDCe,
      vsp: Address.Vesper.VSP,
      strategyName: 'VesperTraderJoeXYStrategy',
    },
    config: { ...config },
    setup: { ...setup },
  },
}

module.exports = Object.freeze(StrategyConfig)
