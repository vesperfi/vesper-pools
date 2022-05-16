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
  AaveLeverageAvalancheStrategyAVAX: {
    contract: 'AaveLeverageAvalancheStrategy',
    type: StrategyTypes.AAVE_LEVERAGE,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Aave.avWAVAX,
      strategyName: 'AaveLeverageAvalancheStrategyAVAX',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },
  Crv2PoolAvaStrategyAvWBTCRenBTC: {
    contract: 'Crv2PoolAvaStrategyAvWBTCRenBTC',
    type: StrategyTypes.CURVE,
    constructorArgs: {
      swapManager,
      collateralIdx: 0,
      strategyName: 'Crv2PoolAvaStrategyAvWBTCRenBTC',
    },
    config: { ...config, externalDepositFee: 0 },
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
    config: { ...config, externalDepositFee: 0 },
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

  TraderJoeStrategyDAI: {
    contract: 'CompoundMultiRewardAvalancheStrategy',
    type: StrategyTypes.TRADER_JOE,
    constructorArgs: {
      swapManager,
      comptroller: Address.TraderJoe.COMPTROLLER,
      rewardDistributor: Address.TraderJoe.REWARD_DISTRIBUTOR,
      rewardToken: Address.TraderJoe.JOE,
      receiptToken: Address.TraderJoe.jDAI,
      strategyName: 'TraderJoeStrategyDAI',
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
  BenqiStrategyDAI: {
    contract: 'CompoundMultiRewardAvalancheStrategy',
    type: StrategyTypes.COMPOUND,
    constructorArgs: {
      swapManager,
      comptroller: Address.Benqi.COMPTROLLER,
      rewardDistributor: Address.Benqi.REWARD_DISTRIBUTOR,
      rewardToken: Address.Benqi.QI,
      receiptToken: Address.Benqi.qiDAI,
      strategyName: 'BenqiStrategyDAI',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },
  BenqiStrategyWETH: {
    contract: 'CompoundMultiRewardAvalancheStrategy',
    type: StrategyTypes.COMPOUND,
    constructorArgs: {
      swapManager,
      comptroller: Address.Benqi.COMPTROLLER,
      rewardDistributor: Address.Benqi.REWARD_DISTRIBUTOR,
      rewardToken: Address.Benqi.QI,
      receiptToken: Address.Benqi.qiETH,
      strategyName: 'BenqiStrategyWETH',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },

  BenqiStrategyWBTC: {
    contract: 'CompoundMultiRewardAvalancheStrategy',
    type: StrategyTypes.COMPOUND,
    constructorArgs: {
      swapManager,
      comptroller: Address.Benqi.COMPTROLLER,
      rewardDistributor: Address.Benqi.REWARD_DISTRIBUTOR,
      rewardToken: Address.Benqi.QI,
      receiptToken: Address.Benqi.qiBTC,
      strategyName: 'BenqiStrategyWBTC',
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

  BenqiLeverageStrategy: {
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

  BenqiLeverageStrategyDAI: {
    contract: 'BenqiLeverageStrategy',
    type: StrategyTypes.COMPOUND_LEVERAGE,
    constructorArgs: {
      swapManager,
      comptroller: Address.Benqi.COMPTROLLER,
      rewardDistributor: Address.Benqi.REWARD_DISTRIBUTOR,
      rewardToken: Address.Benqi.QI,
      aaveAddressProvider: Address.Aave.AddressProvider,
      receiptToken: Address.Benqi.qiDAI,
      strategyName: 'BenqiLeverageStrategyDAI',
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

  BenqiLeverageStrategyWBTC: {
    contract: 'BenqiLeverageStrategy',
    type: StrategyTypes.COMPOUND_LEVERAGE,
    constructorArgs: {
      swapManager,
      comptroller: Address.Benqi.COMPTROLLER,
      rewardDistributor: Address.Benqi.REWARD_DISTRIBUTOR,
      rewardToken: Address.Benqi.QI,
      aaveAddressProvider: Address.Aave.AddressProvider,
      receiptToken: Address.Benqi.qiBTC,
      strategyName: 'BenqiLeverageStrategyWBTC',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },

  BenqiLeverageStrategyWETH: {
    contract: 'BenqiLeverageStrategy',
    type: StrategyTypes.COMPOUND_LEVERAGE,
    constructorArgs: {
      swapManager,
      comptroller: Address.Benqi.COMPTROLLER,
      rewardDistributor: Address.Benqi.REWARD_DISTRIBUTOR,
      rewardToken: Address.Benqi.QI,
      aaveAddressProvider: Address.Aave.AddressProvider,
      receiptToken: Address.Benqi.qiETH,
      strategyName: 'BenqiLeverageStrategyWETH',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },

  TraderJoeLeverageStrategyWETH: {
    contract: 'TraderJoeLeverageStrategy',
    type: StrategyTypes.COMPOUND_LEVERAGE,
    constructorArgs: {
      swapManager,
      comptroller: Address.TraderJoe.COMPTROLLER,
      rewardDistributor: Address.TraderJoe.REWARD_DISTRIBUTOR,
      rewardToken: Address.TraderJoe.JOE,
      aaveAddressProvider: Address.Aave.AddressProvider,
      receiptToken: Address.TraderJoe.jWETH,
      strategyName: 'TraderJoeLeverageStrategyWETH',
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

  TraderJoeLeverageStrategyDAI: {
    contract: 'TraderJoeLeverageStrategy',
    type: StrategyTypes.COMPOUND_LEVERAGE,
    constructorArgs: {
      swapManager,
      comptroller: Address.TraderJoe.COMPTROLLER,
      rewardDistributor: Address.TraderJoe.REWARD_DISTRIBUTOR,
      rewardToken: Address.TraderJoe.JOE,
      aaveAddressProvider: Address.Aave.AddressProvider,
      receiptToken: Address.TraderJoe.jDAI,
      strategyName: 'TraderJoeLeverageStrategyDAI',
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

  TraderJoeLeverageStrategyWBTC: {
    contract: 'TraderJoeLeverageStrategy',
    type: StrategyTypes.COMPOUND_LEVERAGE,
    constructorArgs: {
      swapManager,
      comptroller: Address.TraderJoe.COMPTROLLER,
      rewardDistributor: Address.TraderJoe.REWARD_DISTRIBUTOR,
      rewardToken: Address.TraderJoe.JOE,
      aaveAddressProvider: Address.Aave.AddressProvider,
      receiptToken: Address.TraderJoe.jWBTC,
      strategyName: 'TraderJoeLeverageStrategyWBTC',
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

  AlphaLendAvalancheStrategyUSDCe: {
    contract: 'AlphaLendAvalancheStrategy',
    type: StrategyTypes.ALPHA_LEND,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Alpha.ibUSDCev2,
      strategyName: 'AlphaLendAvalancheStrategyUSDCe',
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

  VesperBenqiXYStrategyWBTC: {
    contract: 'VesperBenqiXYStrategy',
    type: StrategyTypes.VESPER_COMPOUND_XY,
    constructorArgs: {
      swapManager,
      comptroller: Address.Benqi.COMPTROLLER,
      rewardDistributor: Address.Benqi.REWARD_DISTRIBUTOR,
      rewardToken: Address.Benqi.QI,
      receiptToken: Address.Benqi.qiBTC,
      borrowCToken: Address.Benqi.qiETH,
      vPool: Address.Vesper.vaWETH,
      vspAddress: Address.Vesper.VSP,
      strategyName: 'VesperBenqiXYStrategyWBTC',
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
      vPool: Address.Vesper.vaWETH,
      vspAddress: Address.Vesper.VSP,
      strategyName: 'VesperTraderJoeXYStrategyAVAX',
    },
    config: { ...config },
    setup: { ...setup },
  },
}

module.exports = Object.freeze(StrategyConfig)
