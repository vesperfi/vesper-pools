'use strict'

const { ethers } = require('hardhat')
const Address = require('./address')
const StrategyTypes = require('../../test/utils/strategyTypes')

const swapManager = Address.Vesper.SWAP_MANAGER
const config = { debtRatio: 0, externalDepositFee: 0 }

const setup = {
  feeCollector: Address.Vesper.FEE_COLLECTOR,
  keepers: [Address.Vesper.KEEPER, Address.Vesper.MP, Address.Vesper.JCV],
}
// Maker related strategies will have to add more setup config.
// For example const maker = { gemJoin: Address.MCD_JOIN_ETH_A, highWater: 275, lowWater: 250 }

// TODO update setup to remove strategy type, once done remove type from heres too
const StrategyConfig = {
  AaveStrategyDAI: {
    contract: 'AaveStrategy',
    type: StrategyTypes.AAVE,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Aave.aDAI,
      strategyName: 'AaveStrategyDAI',
    },
    config: { ...config }, // Shallow copy
    setup: { ...setup },
  },

  AaveStrategyDPI: {
    contract: 'AaveStrategy',
    type: StrategyTypes.AAVE,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Aave.aDPI,
      strategyName: 'AaveStrategyDPI',
    },
    config: { ...config },
    setup: { ...setup },
  },

  AaveStrategyFEI: {
    contract: 'AaveStrategy',
    type: StrategyTypes.AAVE,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Aave.aFEI,
      strategyName: 'AaveStrategyFEI',
    },
    config: { ...config },
    setup: { ...setup },
  },

  AaveStrategyLINK: {
    contract: 'AaveStrategy',
    type: StrategyTypes.AAVE,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Aave.aLINK,
      strategyName: 'AaveStrategyLINK',
    },
    config: { ...config },
    setup: { ...setup },
  },

  AaveStrategyUNI: {
    contract: 'AaveStrategy',
    type: StrategyTypes.AAVE,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Aave.aUNI,
      strategyName: 'AaveStrategyUNI',
    },
    config: { ...config },
    setup: { ...setup },
  },

  AaveStrategyUSDC: {
    contract: 'AaveStrategy',
    type: StrategyTypes.AAVE,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Aave.aUSDC,
      strategyName: 'AaveStrategyUSDC',
    },
    config: { ...config },
    setup: { ...setup },
  },

  AaveStrategyUSDT: {
    contract: 'AaveStrategy',
    type: StrategyTypes.AAVE,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Aave.aUSDT,
      strategyName: 'AaveStrategyUSDT',
    },
    config: { ...config },
    setup: { ...setup },
  },

  AaveLeverageStrategyDAI: {
    contract: 'AaveLeverageStrategy',
    type: StrategyTypes.AAVE_LEVERAGE,
    constructorArgs: {
      swapManager,
      rewardToken: Address.Aave.AAVE,
      aaveAddressProvider: Address.Aave.AddressProvider,
      receiptToken: Address.Aave.aDAI,
      strategyName: 'AaveLeverageStrategyDAI',
    },
    config: { ...config },
    setup: { ...setup },
  },

  VesperAaveXYStrategyETH_DAI: {
    contract: 'VesperAaveXYStrategy',
    type: StrategyTypes.VESPER_AAVE_XY,
    constructorArgs: {
      swapManager,
      rewardToken: Address.Aave.AAVE,
      receiptToken: Address.Aave.aWETH,
      borrowToken: Address.DAI,
      vPool: Address.Vesper.vaDAI,
      vsp: Address.Vesper.VSP,
      strategyName: 'VesperAaveXYStrategyETH_DAI',
    },
    config: { ...config },
    setup: { ...setup },
  },

  VesperAaveXYStrategyWBTC_FEI: {
    contract: 'VesperAaveXYStrategy',
    type: StrategyTypes.VESPER_AAVE_XY,
    constructorArgs: {
      swapManager,
      rewardToken: Address.Aave.AAVE,
      receiptToken: Address.Aave.aWBTC,
      borrowToken: Address.FEI,
      vPool: Address.Vesper.vaFEI,
      vsp: Address.Vesper.VSP,
      strategyName: 'VesperAaveXYStrategyWBTC_FEI',
    },
    config: { ...config },
    setup: { ...setup },
  },

  VesperAaveXYStrategyWBTC_FRAX: {
    contract: 'VesperAaveXYStrategy',
    type: StrategyTypes.VESPER_AAVE_XY,
    constructorArgs: {
      swapManager,
      rewardToken: Address.Aave.AAVE,
      receiptToken: Address.Aave.aWBTC,
      borrowToken: Address.FRAX,
      vPool: Address.Vesper.vaFRAX,
      vsp: Address.Vesper.VSP,
      strategyName: 'VesperAaveXYStrategyWBTC_FRAX',
    },
    config: { ...config },
    setup: { ...setup },
  },

  // Aave V1 strategy
  AaveV1StrategyUSDC: {
    contract: 'AaveV1Strategy',
    type: StrategyTypes.AAVE_V1,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Aave.aUSDCv1,
      strategyName: 'AaveV1StrategyUSDC',
    },
    config: { ...config },
    setup: { ...setup },
  },
  EarnVesperStrategyDAIVSPDAI: {
    contract: 'EarnVesperStrategyVSPDrip',
    type: StrategyTypes.EARN_VESPER,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Vesper.vDAI,
      dripToken: Address.Vesper.VSP,
      vsp: Address.Vesper.VSP,
      strategyName: 'EarnVesperStrategyDAIVSP',
    },
    config: { ...config },
    setup: { ...setup },
  },
  EarnAaveStrategyETH_DAI: {
    contract: 'EarnAaveStrategy',
    type: StrategyTypes.EARN_AAVE,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Aave.aWETH,
      dripToken: Address.DAI,
      strategyName: 'EarnAaveStrategyETH_DAI',
    },
    config: { ...config },
    setup: { ...setup },
  },

  CompoundStrategyDAI: {
    contract: 'CompoundStrategy',
    type: StrategyTypes.COMPOUND,
    constructorArgs: {
      swapManager,
      comptroller: Address.Compound.COMPTROLLER,
      rewardToken: Address.Compound.COMP,
      receiptToken: Address.Compound.cDAI,
      strategyName: 'CompoundStrategyDAI',
    },
    config: { ...config },
    setup: { ...setup },
  },

  CompoundStrategyLINK: {
    contract: 'CompoundStrategy',
    type: StrategyTypes.COMPOUND,
    constructorArgs: {
      swapManager,
      comptroller: Address.Compound.COMPTROLLER,
      rewardToken: Address.Compound.COMP,
      receiptToken: Address.Compound.cLINK,
      strategyName: 'CompoundStrategyLINK',
    },
    config: { ...config },
    setup: { ...setup },
  },

  CompoundStrategyETH: {
    contract: 'CompoundStrategyETH',
    type: StrategyTypes.COMPOUND,
    constructorArgs: {
      swapManager,
      comptroller: Address.Compound.COMPTROLLER,
      rewardToken: Address.Compound.COMP,
      receiptToken: Address.Compound.cETH,
      strategyName: 'CompoundStrategyETH',
    },
    config: { ...config },
    setup: { ...setup },
  },

  CompoundStrategyUNI: {
    contract: 'CompoundStrategy',
    type: StrategyTypes.COMPOUND,
    constructorArgs: {
      swapManager,
      comptroller: Address.Compound.COMPTROLLER,
      rewardToken: Address.Compound.COMP,
      receiptToken: Address.Compound.cUNI,
      strategyName: 'CompoundStrategyUNI',
    },
    config: { ...config },
    setup: { ...setup },
  },

  CompoundStrategyUSDC: {
    contract: 'CompoundStrategy',
    type: StrategyTypes.COMPOUND,
    constructorArgs: {
      swapManager,
      comptroller: Address.Compound.COMPTROLLER,
      rewardToken: Address.Compound.COMP,
      receiptToken: Address.Compound.cUSDC,
      strategyName: 'CompoundStrategyUSDC',
    },
    config: { ...config },
    setup: { ...setup },
  },

  CompoundStrategyUSDT: {
    contract: 'CompoundStrategy',
    type: StrategyTypes.COMPOUND,
    constructorArgs: {
      swapManager,
      comptroller: Address.Compound.COMPTROLLER,
      rewardToken: Address.Compound.COMP,
      receiptToken: Address.Compound.cUSDT,
      strategyName: 'CompoundStrategyUSDT',
    },
    config: { ...config },
    setup: { ...setup },
  },

  CompoundStrategyWBTC: {
    contract: 'CompoundStrategy',
    type: StrategyTypes.COMPOUND,
    constructorArgs: {
      swapManager,
      comptroller: Address.Compound.COMPTROLLER,
      rewardToken: Address.Compound.COMP,
      receiptToken: Address.Compound.cWBTC,
      strategyName: 'CompoundStrategyWBTC',
    },
    config: { ...config },
    setup: { ...setup },
  },

  InverseCompoundStrategyETH: {
    contract: 'CompoundStrategyETH',
    type: StrategyTypes.COMPOUND,
    constructorArgs: {
      swapManager,
      comptroller: Address.Inverse.COMPTROLLER,
      rewardToken: Address.Inverse.INV,
      receiptToken: Address.Inverse.anETH,
      strategyName: 'InverseCompoundStrategyETH',
    },
    config: { ...config },
    setup: { ...setup },
  },

  InverseCompoundLeverageStrategyETH: {
    contract: 'CompoundLeverageStrategyETH',
    type: StrategyTypes.COMPOUND_LEVERAGE,
    constructorArgs: {
      swapManager,
      comptroller: Address.Inverse.COMPTROLLER,
      rewardDistributor: Address.Inverse.COMPTROLLER,
      rewardToken: Address.Inverse.INV,
      aaveAddressProvider: Address.Aave.AddressProvider,
      receiptToken: Address.Inverse.anETH,
      strategyName: 'InverseCompoundLeverageStrategyETH',
    },
    config: { ...config },
    setup: { ...setup },
  },

  DropsCompoundStrategyETH: {
    contract: 'CompoundStrategyETH',
    type: StrategyTypes.COMPOUND,
    constructorArgs: {
      swapManager,
      comptroller: Address.Drops.COMPTROLLER,
      rewardToken: Address.Drops.DOP,
      receiptToken: Address.Drops.dETH,
      strategyName: 'DropsCompoundStrategyETH',
    },
    config: { ...config },
    setup: { ...setup },
  },

  EarnCompoundStrategyETH_DAI: {
    contract: 'EarnCompoundStrategyETH',
    type: StrategyTypes.EARN_COMPOUND,
    constructorArgs: {
      swapManager,
      comptroller: Address.Compound.COMPTROLLER,
      rewardToken: Address.Compound.COMP,
      receiptToken: Address.Compound.cETH,
      dripToken: Address.DAI,
      strategyName: 'EarnCompoundStrategyETH_DAI',
    },
    config: { ...config },
    setup: { ...setup },
  },

  EarnCompoundStrategyWBTC_DAI: {
    contract: 'EarnCompoundStrategy',
    type: StrategyTypes.EARN_COMPOUND,
    constructorArgs: {
      swapManager,
      comptroller: Address.Compound.COMPTROLLER,
      rewardToken: Address.Compound.COMP,
      receiptToken: Address.Compound.cWBTC,
      dripToken: Address.DAI,
      strategyName: 'EarnCompoundStrategyWBTC_DAI',
    },
    config: { ...config },
    setup: { ...setup },
  },

  CompoundLeverageStrategyETH: {
    contract: 'CompoundLeverageStrategyETH',
    type: StrategyTypes.COMPOUND_LEVERAGE,
    constructorArgs: {
      swapManager,
      rewardDistributor: Address.Compound.COMPTROLLER,
      comptroller: Address.Compound.COMPTROLLER,
      rewardToken: Address.Compound.COMP,
      aaveAddressProvider: Address.Aave.AddressProvider,
      receiptToken: Address.Compound.cETH,
      strategyName: 'CompoundLeverageStrategyETH',
    },
    config: { ...config },
    setup: { ...setup },
  },

  CompoundLeverageStrategyUNI: {
    contract: 'CompoundLeverageStrategy',
    type: StrategyTypes.COMPOUND_LEVERAGE,
    constructorArgs: {
      swapManager,
      comptroller: Address.Compound.COMPTROLLER,
      rewardDistributor: Address.Compound.COMPTROLLER,
      rewardToken: Address.Compound.COMP,
      aaveAddressProvider: Address.Aave.AddressProvider,
      receiptToken: Address.Compound.cUNI,
      strategyName: 'CompoundLeverageStrategyUNI',
    },
    config: { ...config },
    setup: { ...setup },
  },

  CompoundLeverageStrategyLINK: {
    contract: 'CompoundLeverageStrategy',
    type: StrategyTypes.COMPOUND_LEVERAGE,
    constructorArgs: {
      swapManager,
      rewardDistributor: Address.Compound.COMPTROLLER,
      comptroller: Address.Compound.COMPTROLLER,
      rewardToken: Address.Compound.COMP,
      aaveAddressProvider: Address.Aave.AddressProvider,
      receiptToken: Address.Compound.cLINK,
      strategyName: 'CompoundLeverageStrategyLINK',
    },
    config: { ...config },
    setup: { ...setup },
  },

  CompoundLeverageStrategyWBTC: {
    contract: 'CompoundLeverageStrategy',
    type: StrategyTypes.COMPOUND_LEVERAGE,
    constructorArgs: {
      swapManager,
      rewardDistributor: Address.Compound.COMPTROLLER,
      comptroller: Address.Compound.COMPTROLLER,
      rewardToken: Address.Compound.COMP,
      aaveAddressProvider: Address.Aave.AddressProvider,
      receiptToken: Address.Compound.cWBTC,
      strategyName: 'CompoundLeverageStrategyWBTC',
    },
    config: { ...config },
    setup: { ...setup },
  },

  CompoundXYStrategyETH_DAI: {
    contract: 'CompoundXYStrategyETH',
    type: StrategyTypes.COMPOUND_XY,
    constructorArgs: {
      swapManager,
      comptroller: Address.Compound.COMPTROLLER,
      rewardToken: Address.Compound.COMP,
      receiptToken: Address.Compound.cETH,
      borrowCToken: Address.Compound.cDAI,
      strategyName: 'CompoundXYStrategyETH_DAI',
    },
    config: { ...config },
    setup: { ...setup },
  },

  CompoundXYStrategyWBTC_DAI: {
    contract: 'CompoundXYStrategy',
    type: StrategyTypes.COMPOUND_XY,
    constructorArgs: {
      swapManager,
      comptroller: Address.Compound.COMPTROLLER,
      rewardToken: Address.Compound.COMP,
      receiptToken: Address.Compound.cWBTC,
      borrowCToken: Address.Compound.cDAI,
      strategyName: 'CompoundXYStrategyWBTC_DAI',
    },
    config: { ...config },
    setup: { ...setup },
  },

  VesperCompoundXYStrategyETH_WBTC: {
    contract: 'VesperCompoundXYStrategyETH',
    type: StrategyTypes.VESPER_COMPOUND_XY,
    constructorArgs: {
      swapManager,
      comptroller: Address.Compound.COMPTROLLER,
      rewardToken: Address.Compound.COMP,
      receiptToken: Address.Compound.cETH,
      borrowCToken: Address.Compound.cWBTC,
      vPool: Address.Vesper.vaWBTC,
      vsp: Address.Vesper.VSP,
      strategyName: 'VesperCompoundXYStrategyETH_WBTC',
    },
    config: { ...config },
    setup: { ...setup },
  },

  VesperCompoundXYStrategyETH_LINK: {
    contract: 'VesperCompoundXYStrategy',
    type: StrategyTypes.VESPER_COMPOUND_XY,
    constructorArgs: {
      swapManager,
      comptroller: Address.Compound.COMPTROLLER,
      rewardToken: Address.Compound.COMP,
      receiptToken: Address.Compound.cETH,
      borrowCToken: Address.Compound.cLINK,
      vPool: Address.Vesper.vaLINK,
      vsp: Address.Vesper.VSP,
      strategyName: 'VesperCompoundXYStrategyETH_LINK',
    },
    config: { ...config },
    setup: { ...setup },
  },

  VesperCompoundXYStrategyWBTC_DAI: {
    contract: 'VesperCompoundXYStrategy',
    type: StrategyTypes.VESPER_COMPOUND_XY,
    constructorArgs: {
      swapManager,
      comptroller: Address.Compound.COMPTROLLER,
      rewardToken: Address.Compound.COMP,
      receiptToken: Address.Compound.cWBTC,
      borrowCToken: Address.Compound.cDAI,
      vPool: Address.Vesper.vaDAI,
      vsp: Address.Vesper.VSP,
      strategyName: 'VesperCompoundXYStrategyWBTC_DAI',
    },
    config: { ...config },
    setup: { ...setup },
  },

  VesperCompoundXYStrategyWBTC_USDC: {
    contract: 'VesperCompoundXYStrategy',
    type: StrategyTypes.VESPER_COMPOUND_XY,
    constructorArgs: {
      swapManager,
      comptroller: Address.Compound.COMPTROLLER,
      rewardToken: Address.Compound.COMP,
      receiptToken: Address.Compound.cWBTC,
      borrowCToken: Address.Compound.cUSDC,
      vPool: Address.Vesper.vaUSDC,
      vsp: Address.Vesper.VSP,
      strategyName: 'VesperCompoundXYStrategyWBTC_USDC',
    },
    config: { ...config },
    setup: { ...setup },
  },

  VesperCompoundXYStrategyWBTC_LINK: {
    contract: 'VesperCompoundXYStrategy',
    type: StrategyTypes.VESPER_COMPOUND_XY,
    constructorArgs: {
      swapManager,
      comptroller: Address.Compound.COMPTROLLER,
      rewardToken: Address.Compound.COMP,
      receiptToken: Address.Compound.cWBTC,
      borrowCToken: Address.Compound.cLINK,
      vPool: Address.Vesper.vaLINK,
      vsp: Address.Vesper.VSP,
      strategyName: 'VesperCompoundXYStrategyWBTC_LINK',
    },
    config: { ...config },
    setup: { ...setup },
  },

  IronBankXYStrategyETH_DAI: {
    contract: 'IronBankXYStrategy',
    type: StrategyTypes.COMPOUND_XY,
    constructorArgs: {
      swapManager,
      comptroller: Address.IronBank.Unitroller,
      receiptToken: Address.IronBank.iWETH,
      borrowCToken: Address.IronBank.iDAI,
      strategyName: 'IronBankXYStrategyETH_DAI',
    },
    config: { ...config },
    setup: { ...setup },
  },

  VesperIronBankXYStrategyETH_DAI: {
    contract: 'VesperIronBankXYStrategy',
    type: StrategyTypes.VESPER_COMPOUND_XY,
    constructorArgs: {
      swapManager,
      comptroller: Address.IronBank.Unitroller,
      receiptToken: Address.IronBank.iWETH,
      borrowCToken: Address.IronBank.iDAI,
      vPool: Address.Vesper.vaDAI,
      vsp: Address.Vesper.VSP,
      strategyName: 'VesperIronBankXYStrategyETH_DAI',
    },
    config: { ...config },
    setup: { ...setup },
  },

  RariFuseStrategyDAI: {
    contract: 'RariFuseStrategy',
    type: StrategyTypes.RARI_FUSE,
    constructorArgs: {
      swapManager,
      fusePoolId: 23, // default
      fusePoolDirectory: Address.Rari.fusePoolDirectory,
      strategyName: 'RariFuseStrategy',
    },
    config: { ...config },
    setup: { ...setup },
  },

  RariFuseStrategyUSDC: {
    contract: 'RariFuseStrategy',
    type: StrategyTypes.RARI_FUSE,
    constructorArgs: {
      swapManager,
      fusePoolId: 23, // default
      fusePoolDirectory: Address.Rari.fusePoolDirectory,
      strategyName: 'RariFuseStrategy',
    },
    config: { ...config },
    setup: { ...setup },
  },

  RariFuseStrategyWBTC: {
    contract: 'RariFuseStrategy',
    type: StrategyTypes.RARI_FUSE,
    constructorArgs: {
      swapManager,
      fusePoolId: 23, // default
      fusePoolDirectory: Address.Rari.fusePoolDirectory,
      strategyName: 'RariFuseStrategy',
    },
    config: { ...config },
    setup: { ...setup },
  },

  RariFuseStrategyETH: {
    contract: 'RariFuseStrategyETH',
    type: StrategyTypes.RARI_FUSE,
    constructorArgs: {
      swapManager,
      fusePoolId: 23, // default
      fusePoolDirectory: Address.Rari.fusePoolDirectory,
      strategyName: 'RariFuseStrategyETH',
    },
    config: { ...config },
    setup: { ...setup },
  },

  RariFuseStrategyFEI: {
    contract: 'RariFuseStrategy',
    type: StrategyTypes.RARI_FUSE,
    constructorArgs: {
      swapManager,
      fusePoolId: 8,
      fusePoolDirectory: Address.Rari.fusePoolDirectory,
      strategyName: 'RariFuseStrategy',
    },
    config: { ...config },
    setup: { ...setup },
  },

  RariFuseStrategyFRAX: {
    contract: 'RariFuseStrategy',
    type: StrategyTypes.RARI_FUSE,
    constructorArgs: {
      swapManager,
      fusePoolId: 18,
      fusePoolDirectory: Address.Rari.fusePoolDirectory,
      strategyName: 'RariFuseStrategy',
    },
    config: { ...config },
    setup: { ...setup },
  },

  RariFuseStrategyAPE: {
    contract: 'RariFuseStrategyAPE',
    type: StrategyTypes.RARI_FUSE,
    constructorArgs: {
      swapManager,
      fusePoolId: 127,
      fusePoolDirectory: Address.Rari.fusePoolDirectory,
      strategyName: 'RariFuseStrategy',
    },
    config: { ...config },
    setup: { ...setup },
  },

  RariFuseLeverageStrategyDAI: {
    contract: 'RariFuseLeverageStrategy',
    type: StrategyTypes.COMPOUND_LEVERAGE,
    constructorArgs: {
      swapManager,
      aaveAddressProvider: Address.Aave.AddressProvider,
      fusePoolId: 8,
      fusePoolDirectory: Address.Rari.fusePoolDirectory,
      strategyName: 'RariFuseLeverageStrategyDAI',
    },
    config: { ...config },
    setup: { ...setup },
  },

  RariFuseLeverageStrategyFEI: {
    contract: 'RariFuseLeverageStrategy',
    type: StrategyTypes.COMPOUND_LEVERAGE,
    constructorArgs: {
      swapManager,
      aaveAddressProvider: Address.Aave.AddressProvider,
      fusePoolId: 8,
      fusePoolDirectory: Address.Rari.fusePoolDirectory,
      strategyName: 'RariFuseLeverageStrategyFEI',
    },
    config: { ...config },
    setup: { ...setup },
  },

  EarnRariFuseStrategy: {
    contract: 'EarnRariFuseStrategy',
    type: StrategyTypes.EARN_RARI_FUSE,
    constructorArgs: {
      swapManager,
      fusePoolId: 23, // default,
      fusePoolDirectory: Address.Rari.fusePoolDirectory,
      dripToken: Address.DAI,
      strategyName: 'EarnRariFuseStrategy',
    },
    config: { ...config },
    setup: { ...setup },
  },

  AlphaLendStrategyDAI: {
    contract: 'AlphaLendStrategy',
    type: StrategyTypes.ALPHA_LEND,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Alpha.ibDAIv2,
      strategyName: 'AlphaLendStrategyDAI',
    },
    config: { ...config },
    setup: { ...setup },
  },

  AlphaLendStrategyDPI: {
    contract: 'AlphaLendStrategy',
    type: StrategyTypes.ALPHA_LEND,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Alpha.ibDPIv2,
      strategyName: 'AlphaLendStrategyDPI',
    },
    config: { ...config },
    setup: { ...setup },
  },

  AlphaLendStrategyETH: {
    contract: 'AlphaLendStrategyETH',
    type: StrategyTypes.ALPHA_LEND,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Alpha.ibETHv2,
      strategyName: 'AlphaLendStrategyETH',
    },
    config: { ...config },
    setup: { ...setup },
  },

  AlphaLendStrategyLINK: {
    contract: 'AlphaLendStrategy',
    type: StrategyTypes.ALPHA_LEND,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Alpha.ibLINKv2,
      strategyName: 'AlphaLendStrategyLINK',
    },
    config: { ...config },
    setup: { ...setup },
  },

  AlphaLendStrategyUSDC: {
    contract: 'AlphaLendStrategy',
    type: StrategyTypes.ALPHA_LEND,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Alpha.ibUSDCv2,
      strategyName: 'AlphaLendStrategyUSDC',
    },
    config: { ...config },
    setup: { ...setup },
  },

  AlphaLendStrategyUSDT: {
    contract: 'AlphaLendStrategy',
    type: StrategyTypes.ALPHA_LEND,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Alpha.ibUSDTv2,
      strategyName: 'AlphaLendStrategyUSDT',
    },
    config: { ...config },
    setup: { ...setup },
  },

  EarnAlphaLendStrategyETH: {
    contract: 'EarnAlphaLendStrategyETH',
    type: StrategyTypes.EARN_ALPHA_LEND,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Alpha.ibETHv2,
      dripToken: Address.DAI,
      strategyName: 'EarnAlphaLendStrategyETH',
    },
    config: { ...config },
    setup: { ...setup },
  },

  Convex2PoolStrategyMIMUSTPoolMIM: {
    contract: 'Convex2PoolStrategyMIMUSTPool',
    type: StrategyTypes.CONVEX,
    constructorArgs: {
      swapManager,
      collateralIdx: 0,
      strategyName: 'Convex2PoolStrategyMIMUSTPoolMIM',
    },
    config: { ...config },
    setup: { ...setup },
  },

  Convex3PoolStrategyDAI: {
    contract: 'Convex3PoolStrategy',
    type: StrategyTypes.CONVEX,
    constructorArgs: {
      swapManager,
      collateralIdx: 0,
      strategyName: 'Convex3PoolStrategyDAI',
    },
    config: { ...config },
    setup: { ...setup },
  },

  ConvexSBTCPoolStrategyWBTC: {
    contract: 'ConvexSBTCPoolStrategy',
    type: StrategyTypes.CONVEX,
    constructorArgs: {
      swapManager,
      collateralIdx: 1,
      strategyName: 'ConvexSBTCPoolStrategyWBTC',
    },
    config: { ...config },
    setup: { ...setup },
  },

  ConvexD3PoolStrategyFRAX: {
    contract: 'ConvexD3PoolStrategy',
    type: StrategyTypes.CONVEX,
    constructorArgs: {
      swapManager,
      collateralIdx: 0,
      strategyName: 'ConvexD3PoolStrategyFRAX',
    },
    config: { ...config },
    setup: { ...setup },
  },

  ConvexD3PoolStrategyFEI: {
    contract: 'ConvexD3PoolStrategy',
    type: StrategyTypes.CONVEX,
    constructorArgs: {
      swapManager,
      collateralIdx: 1,
      strategyName: 'ConvexD3PoolStrategyFEI',
    },
    config: { ...config },
    setup: { ...setup },
  },

  ConvexD3PoolStrategyAlUSD: {
    contract: 'ConvexD3PoolStrategy',
    type: StrategyTypes.CONVEX,
    constructorArgs: {
      swapManager,
      collateralIdx: 2,
      strategyName: 'ConvexD3PoolStrategyAlUSD',
    },
    config: { ...config },
    setup: { ...setup },
  },

  Convex4MetaPoolStrategyMIMPoolMIM: {
    contract: 'Convex4MetaPoolStrategyMIMPool',
    type: StrategyTypes.CONVEX,
    constructorArgs: {
      swapManager,
      collateralIdx: 0,
      strategyName: 'Convex4MetaPoolStrategyMIMPoolMIM',
    },
    config: { ...config },
    setup: { ...setup },
  },

  Convex4PoolStrategyMUSDPoolMUSD: {
    contract: 'Convex4PoolStrategyMUSDPool',
    type: StrategyTypes.CONVEX,
    constructorArgs: {
      swapManager,
      collateralIdx: 0,
      strategyName: 'Convex4PoolStrategyMUSDPoolMUSD',
    },
    config: { ...config },
    setup: { ...setup },
  },
  Convex4MetaPoolStrategyFRAXPoolFRAX: {
    contract: 'Convex4MetaPoolStrategyFRAXPool',
    type: StrategyTypes.CONVEX,
    constructorArgs: {
      swapManager,
      collateralIdx: 0,
      strategyName: 'Convex4MetaPoolStrategyFRAXPool',
    },
    config: { ...config },
    setup: { ...setup },
  },

  Convex4MetaPoolStrategyFRAXPoolDAI: {
    contract: 'Convex4MetaPoolStrategyFRAXPool',
    type: StrategyTypes.CONVEX,
    constructorArgs: {
      swapManager,
      collateralIdx: 1,
      strategyName: 'Convex4MetaPoolStrategyFRAXPool',
    },
    config: { ...config },
    setup: { ...setup },
  },

  Convex4MetaPoolStrategyFRAXPoolUSDC: {
    contract: 'Convex4MetaPoolStrategyFRAXPool',
    type: StrategyTypes.CONVEX,
    constructorArgs: {
      swapManager,
      collateralIdx: 2,
      strategyName: 'Convex4MetaPoolStrategyFRAXPool',
    },
    config: { ...config },
    setup: { ...setup },
  },

  Convex4MetaPoolStrategyIBBTCPoolWBTC: {
    contract: 'Convex4MetaPoolStrategyIBBTCPool',
    type: StrategyTypes.CONVEX,
    constructorArgs: {
      swapManager,
      collateralIdx: 2,
      strategyName: 'Convex4MetaPoolStrategyIBBTCPoolWBTC',
    },
    config: { ...config },
    setup: { ...setup },
  },

  Crv2PoolStrategyMIMUSTPoolMIM: {
    contract: 'Crv2PoolStrategyMIMUSTPool',
    type: StrategyTypes.CURVE,
    constructorArgs: {
      swapManager,
      collateralIdx: 0,
      strategyName: 'Crv2PoolStrategyMIMUSTPoolMIM',
    },
    config: { ...config },
    setup: { ...setup },
  },

  Crv3PoolStrategyDAI: {
    contract: 'Crv3PoolStrategy',
    type: StrategyTypes.CURVE,
    constructorArgs: {
      swapManager,
      collateralIdx: 0,
      strategyName: 'Crv3PoolStrategyDAI',
    },
    config: { ...config, externalDepositFee: 100 },
    setup: { ...setup },
  },

  Crv3PoolStrategyUSDC: {
    contract: 'Crv3PoolStrategy',
    type: StrategyTypes.CURVE,
    constructorArgs: {
      swapManager,
      collateralIdx: 1,
      strategyName: 'Crv3PoolStrategyUSDC',
    },
    config: { ...config },
    setup: { ...setup },
  },

  CrvSBTCPoolStrategyWBTC: {
    contract: 'CrvSBTCPoolStrategy',
    type: StrategyTypes.CURVE,
    constructorArgs: {
      swapManager,
      collateralIdx: 1,
      strategyName: 'CrvSBTCPoolStrategyWBTC',
    },
    config: { ...config },
    setup: { ...setup },
  },

  EarnCrvSBTCPoolStrategyWBTC_DAI: {
    contract: 'EarnCrvSBTCPoolStrategy',
    type: StrategyTypes.EARN_CURVE,
    constructorArgs: {
      swapManager,
      dripToken: Address.DAI,
      strategyName: 'EarnCrvSBTCPoolStrategyWBTC_DAI',
    },
    config: { ...config },
    setup: { ...setup },
  },

  Crv4MetaPoolStrategyMIMPoolDAI: {
    contract: 'Crv4MetaPoolStrategyMIMPool',
    type: StrategyTypes.CURVE,
    constructorArgs: {
      swapManager,
      collateralIdx: 1,
      strategyName: 'Crv4MetaPoolStrategyMIMPoolDAI',
    },
    config: { ...config, externalDepositFee: 100 },
    setup: { ...setup },
  },

  Crv4MetaPoolStrategyFRAXPoolDAI: {
    contract: 'Crv4MetaPoolStrategyFRAXPool',
    type: StrategyTypes.CURVE,
    constructorArgs: {
      swapManager,
      collateralIdx: 1,
      strategyName: 'Crv4MetaPoolStrategyFRAXPoolDAI',
    },
    config: { ...config },
    setup: { ...setup },
  },

  Crv4MetaPoolStrategyMIMPoolMIM: {
    contract: 'Crv4MetaPoolStrategyMIMPool',
    type: StrategyTypes.CURVE,
    constructorArgs: {
      swapManager,
      collateralIdx: 0,
      strategyName: 'Crv4MetaPoolStrategyMIMPoolMIM',
    },
    config: { ...config },
    setup: { ...setup },
  },

  Crv4PoolStrategySUSDPoolDAI: {
    contract: 'Crv4PoolStrategySUSDPool',
    type: StrategyTypes.CURVE,
    constructorArgs: {
      swapManager,
      collateralIdx: 0,
      strategyName: 'Crv4PoolStrategySUSDPoolDAI',
    },
    config: { ...config, externalDepositFee: 100 },
    setup: { ...setup },
  },

  CrvA3PoolStrategyDAI: {
    contract: 'CrvA3PoolStrategy',
    type: StrategyTypes.CURVE,
    constructorArgs: {
      swapManager,
      collateralIdx: 0,
      strategyName: 'CrvA3PoolStrategyDAI',
    },
    config: { ...config },
    setup: { ...setup },
  },
  CrvA3PoolStrategyUSDC: {
    contract: 'CrvA3PoolStrategy',
    type: StrategyTypes.CURVE,
    constructorArgs: {
      swapManager,
      collateralIdx: 1,
      strategyName: 'CrvA3PoolStrategyUSDC',
    },
    config: { ...config },
    setup: { ...setup },
  },
  AaveMakerStrategyETH: {
    contract: 'AaveMakerStrategy',
    type: StrategyTypes.AAVE_MAKER,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Aave.aDAI,
      collateralType: ethers.utils.formatBytes32String('ETH-A'),
      strategyName: 'AaveMakerStrategyETH',
    },
    config: { ...config },
    setup: { ...setup, maker: { gemJoin: Address.Maker.MCD_JOIN_ETH_A, highWater: 275, lowWater: 250 } },
  },

  CompoundMakerStrategyETH: {
    contract: 'CompoundMakerStrategy',
    type: StrategyTypes.COMPOUND_MAKER,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Compound.cDAI,
      collateralType: ethers.utils.formatBytes32String('ETH-C'),
      strategyName: 'CompoundMakerStrategyETH',
    },
    config: { ...config },
    setup: { ...setup, maker: { gemJoin: Address.Maker.MCD_JOIN_ETH_C, highWater: 250, lowWater: 225 } },
  },

  CompoundMakerStrategyUNI: {
    contract: 'CompoundMakerStrategy',
    type: StrategyTypes.COMPOUND_MAKER,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Compound.cDAI,
      collateralType: ethers.utils.formatBytes32String('UNI-A'),
      strategyName: 'CompoundMakerStrategyUNI',
    },
    config: { ...config },
    setup: { ...setup, maker: { gemJoin: Address.Maker.MCD_JOIN_UNI_A, highWater: 275, lowWater: 250 } },
  },

  VesperMakerStrategyETH: {
    contract: 'VesperMakerStrategy',
    type: StrategyTypes.VESPER_MAKER,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Vesper.vaDAI,
      collateralType: ethers.utils.formatBytes32String('ETH-C'),
      strategyName: 'VesperMakerStrategyETH',
    },
    config: { ...config },
    setup: { ...setup, maker: { gemJoin: Address.Maker.MCD_JOIN_ETH_C, highWater: 250, lowWater: 225 } },
  },

  VesperMakerStrategyLINK: {
    contract: 'VesperMakerStrategy',
    type: StrategyTypes.VESPER_MAKER,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Vesper.vaDAI,
      collateralType: ethers.utils.formatBytes32String('LINK-A'),
      strategyName: 'VesperMakerStrategyLINK',
    },
    config: { ...config },
    setup: { ...setup, maker: { gemJoin: Address.Maker.MCD_JOIN_LINK_A, highWater: 250, lowWater: 225 } },
  },

  VesperMakerStrategyWBTC: {
    contract: 'VesperMakerStrategy',
    type: StrategyTypes.VESPER_MAKER,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Vesper.vaDAI,
      collateralType: ethers.utils.formatBytes32String('WBTC-C'),
      strategyName: 'VesperMakerStrategyWBTC',
    },
    config: { ...config },
    setup: { ...setup, maker: { gemJoin: Address.Maker.MCD_JOIN_WBTC_C, highWater: 250, lowWater: 225 } },
  },

  EarnAaveMakerStrategyETH_DAI: {
    contract: 'EarnAaveMakerStrategy',
    type: StrategyTypes.EARN_MAKER,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Aave.aDAI,
      collateralType: ethers.utils.formatBytes32String('ETH-C'),
      dripToken: Address.DAI,
      strategyName: 'EarnAaveMakerStrategyETH_DAI',
    },
    config: { ...config },
    setup: { ...setup, maker: { gemJoin: Address.Maker.MCD_JOIN_ETH_C, highWater: 250, lowWater: 225 } },
  },

  EarnCompoundMakerStrategyETH_DAI: {
    contract: 'EarnCompoundMakerStrategy',
    type: StrategyTypes.EARN_MAKER,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Compound.cDAI,
      collateralType: ethers.utils.formatBytes32String('ETH-C'),
      dripToken: Address.DAI,
      strategyName: 'EarnCompoundMakerStrategyETH_DAI',
    },
    config: { ...config },
    setup: { ...setup, maker: { gemJoin: Address.Maker.MCD_JOIN_ETH_C, highWater: 250, lowWater: 225 } },
  },

  EarnVesperMakerStrategyETH_DAI: {
    contract: 'EarnVesperMakerStrategy',
    type: StrategyTypes.EARN_VESPER_MAKER,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Vesper.vaDAI,
      collateralType: ethers.utils.formatBytes32String('ETH-C'),
      dripToken: Address.DAI,
      strategyName: 'EarnVesperMakerStrategyETH_DAI',
    },
    config: { ...config },
    setup: { ...setup, maker: { gemJoin: Address.Maker.MCD_JOIN_ETH_C, highWater: 250, lowWater: 225 } },
  },

  EarnVesperMakerStrategyLINK_DAI: {
    contract: 'EarnVesperMakerStrategy',
    type: StrategyTypes.EARN_VESPER_MAKER,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Vesper.vaDAI,
      collateralType: ethers.utils.formatBytes32String('LINK-A'),
      dripToken: Address.DAI,
      strategyName: 'EarnVesperMakerStrategyLINK_DAI',
    },
    config: { ...config },
    setup: { ...setup, maker: { gemJoin: Address.Maker.MCD_JOIN_LINK_A, highWater: 275, lowWater: 250 } },
  },

  EarnVesperMakerStrategyWBTC_DAI: {
    contract: 'EarnVesperMakerStrategy',
    type: StrategyTypes.EARN_VESPER_MAKER,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Vesper.vaDAI,
      collateralType: ethers.utils.formatBytes32String('WBTC-A'),
      dripToken: Address.DAI,
      strategyName: 'EarnVesperMakerStrategyWBTC_DAI',
    },
    config: { ...config },
    setup: { ...setup, maker: { gemJoin: Address.Maker.MCD_JOIN_WBTC_A, highWater: 250, lowWater: 225 } },
  },

  EarnVesperStrategyDAIDPI: {
    contract: 'EarnVesperStrategy',
    type: StrategyTypes.EARN_VESPER,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Vesper.vaDAI,
      dripToken: Address.DPI,
      vsp: Address.Vesper.VSP,
      strategyName: 'EarnVesperStrategyDAIDPI',
    },
    config: { ...config },
    setup: { ...setup },
  },

  EarnVesperStrategyDAILINK: {
    contract: 'EarnVesperStrategy',
    type: StrategyTypes.EARN_VESPER,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Vesper.vaDAI,
      dripToken: Address.LINK,
      vsp: Address.Vesper.VSP,
      strategyName: 'EarnVesperStrategyDAILINK',
    },
    config: { ...config },
    setup: { ...setup },
  },

  EarnVesperStrategyLINKDAI: {
    contract: 'EarnVesperStrategy',
    type: StrategyTypes.EARN_VESPER,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Vesper.vaLINK,
      dripToken: Address.DAI,
      vsp: Address.Vesper.VSP,
      strategyName: 'EarnVesperStrategyLINKDAI',
    },
    config: { ...config },
    setup: { ...setup },
  },

  EarnVesperStrategyDAISHIB: {
    contract: 'EarnVesperStrategy',
    type: StrategyTypes.EARN_VESPER,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Vesper.vaDAI,
      dripToken: Address.SHIB,
      vsp: Address.Vesper.VSP,
      strategyName: 'EarnVesperStrategyDAISHIB',
    },
    config: { ...config },
    setup: { ...setup },
  },

  EarnVesperStrategyDAIPUNK: {
    contract: 'EarnVesperStrategy',
    type: StrategyTypes.EARN_VESPER,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Vesper.vaDAI,
      dripToken: Address.PUNK,
      vsp: Address.Vesper.VSP,
      strategyName: 'EarnVesperStrategyDAIPUNK',
    },
    config: { ...config },
    setup: { ...setup },
  },

  EarnVesperStrategyUSDCLMR: {
    contract: 'EarnVesperStrategy',
    type: StrategyTypes.EARN_VESPER,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Vesper.vaUSDC,
      dripToken: Address.LMR,
      vsp: Address.Vesper.VSP,
      strategyName: 'EarnVesperStrategyUSDCLMR',
    },
    config: { ...config },
    setup: { ...setup },
  },

  EarnVesperStrategyDAIVSP: {
    contract: 'EarnVesperStrategyVSPDrip',
    type: StrategyTypes.EARN_VESPER,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Vesper.vaDAI,
      dripToken: Address.Vesper.VSP,
      vsp: Address.Vesper.VSP,
      strategyName: 'EarnVesperStrategyDAIVSP',
    },
    config: { ...config },
    setup: { ...setup },
  },

  EarnVesperStrategyDAIWBTC: {
    contract: 'EarnVesperStrategy',
    type: StrategyTypes.EARN_VESPER,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Vesper.vaDAI,
      dripToken: Address.WBTC,
      vsp: Address.Vesper.VSP,
      strategyName: 'EarnVesperStrategyDAIWBTC',
    },
    config: { ...config },
    setup: { ...setup },
  },

  EarnVesperStrategyDAIWETH: {
    contract: 'EarnVesperStrategy',
    type: StrategyTypes.EARN_VESPER,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Vesper.vaDAI,
      dripToken: Address.WETH,
      vsp: Address.Vesper.VSP,
      strategyName: 'EarnVesperStrategyDAIWETH',
    },
    config: { ...config },
    setup: { ...setup },
  },

  EarnVesperStrategyETHDAI: {
    contract: 'EarnVesperStrategy',
    type: StrategyTypes.EARN_VESPER,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Vesper.vaETH,
      dripToken: Address.DAI,
      vsp: Address.Vesper.VSP,
      strategyName: 'EarnVesperStrategyETHDAI',
    },
    config: { ...config },
    setup: { ...setup },
  },

  EarnVesperStrategyWBTCDAI: {
    contract: 'EarnVesperStrategy',
    type: StrategyTypes.EARN_VESPER,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Vesper.vaWBTC,
      dripToken: Address.DAI,
      vsp: Address.Vesper.VSP,
      strategyName: 'EarnVesperStrategyWBTCDAI',
    },
    config: { ...config },
    setup: { ...setup },
  },

  YearnStrategyDAI: {
    contract: 'YearnStrategy',
    type: StrategyTypes.YEARN,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Yearn.yvDAI,
      strategyName: 'YearnStrategyDAI',
    },
    config: { ...config },
    setup: { ...setup },
  },

  YearnStrategyUSDC: {
    contract: 'YearnStrategy',
    type: StrategyTypes.YEARN,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Yearn.yvUSDC,
      strategyName: 'YearnStrategyUSDC',
    },
    config: { ...config },
    setup: { ...setup },
  },
}

module.exports = Object.freeze(StrategyConfig)
