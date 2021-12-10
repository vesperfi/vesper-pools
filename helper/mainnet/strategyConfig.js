'use strict'

const { ethers } = require('hardhat')
const Address = require('./address')
const StrategyTypes = require('../../test/utils/strategyTypes')

const swapManager = Address.SWAP_MANAGER
const interestFee = '1500' // 15%
const config = { interestFee, debtRatio: 0, debtRate: ethers.utils.parseEther('1000000') }

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
    config,
  },

  AaveStrategyDPI: {
    contract: 'AaveStrategy',
    type: StrategyTypes.AAVE,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Aave.aDPI,
      strategyName: 'AaveStrategyDPI',
    },
    config,
  },

  AaveStrategyFEI: {
    contract: 'AaveStrategy',
    type: StrategyTypes.AAVE,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Aave.aFEI,
      strategyName: 'AaveStrategyFEI',
    },
    config,
  },

  AaveStrategyUNI: {
    contract: 'AaveStrategy',
    type: StrategyTypes.AAVE,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Aave.aUNI,
      strategyName: 'AaveStrategyUNI',
    },
    config,
  },

  AaveStrategyUSDC: {
    contract: 'AaveStrategy',
    type: StrategyTypes.AAVE,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Aave.aUSDC,
      strategyName: 'AaveStrategyUSDC',
    },
    config: { interestFee, debtRatio: 0, debtRate: ethers.utils.parseUnits('1000000', 6) },
  },

  AaveStrategyUSDT: {
    contract: 'AaveStrategy',
    type: StrategyTypes.AAVE,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Aave.aUSDT,
      strategyName: 'AaveStrategyUSDT',
    },
    config: { interestFee, debtRatio: 0, debtRate: ethers.utils.parseUnits('1000000', 6) },
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
    config: { interestFee, debtRatio: 0, debtRate: ethers.utils.parseUnits('1000000', 6) },
  },

  EarnAaveStrategyWETH: {
    contract: 'EarnAaveStrategy',
    type: StrategyTypes.EARN_AAVE,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Aave.aWETH,
      dripToken: Address.DAI,
      strategyName: 'EarnAaveStrategyWETH',
    },
    config,
  },

  CompoundStrategyDAI: {
    contract: 'CompoundStrategy',
    type: StrategyTypes.COMPOUND,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Compound.cDAI,
      strategyName: 'CompoundStrategyDAI',
    },
    config,
  },

  CompoundStrategyETH: {
    contract: 'CompoundStrategyETH',
    type: StrategyTypes.COMPOUND,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Compound.cETH,
      strategyName: 'CompoundStrategyETH',
    },
    config,
  },

  CompoundStrategyUNI: {
    contract: 'CompoundStrategy',
    type: StrategyTypes.COMPOUND,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Compound.cUNI,
      strategyName: 'CompoundStrategyUNI',
    },
    config,
  },

  CompoundStrategyUSDC: {
    contract: 'CompoundStrategy',
    type: StrategyTypes.COMPOUND,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Compound.cUSDC,
      strategyName: 'CompoundStrategyUSDC',
    },
    config: { interestFee, debtRatio: 0, debtRate: ethers.utils.parseUnits('1000000', 6) },
  },

  CompoundStrategyUSDT: {
    contract: 'CompoundStrategy',
    type: StrategyTypes.COMPOUND,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Compound.cUSDT,
      strategyName: 'CompoundStrategyUSDT',
    },
    config: { interestFee, debtRatio: 0, debtRate: ethers.utils.parseUnits('1000000', 6) },
  },

  CompoundStrategyWBTC: {
    contract: 'CompoundStrategy',
    type: StrategyTypes.COMPOUND,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Compound.cWBTC,
      strategyName: 'CompoundStrategyWBTC',
    },
    config: { interestFee, debtRatio: 0, debtRate: ethers.utils.parseUnits('1000000', 8) },
  },

  EarnCompoundStrategyETH: {
    contract: 'EarnCompoundStrategyETH',
    type: StrategyTypes.EARN_COMPOUND,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Compound.cETH,
      dripToken: Address.DAI,
      strategyName: 'EarnCompoundStrategyETH',
    },
    config,
  },

  EarnCompoundStrategyWBTC: {
    contract: 'EarnCompoundStrategy',
    type: StrategyTypes.EARN_COMPOUND,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Compound.cWBTC,
      dripToken: Address.DAI,
      name: 'EarnCompoundStrategyWBTC',
    },
    config: { interestFee, debtRatio: 0, debtRate: ethers.utils.parseUnits('1000000', 8) },
  },

  CompoundCoverageStrategyDAI: {
    contract: 'CompoundCoverageStrategy',
    type: StrategyTypes.COMPOUND,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Compound.cDAI,
      strategyName: 'CompoundCoverageStrategyDAI',
    },
    config,
  },

  CompoundStableStrategyDAI: {
    contract: 'CompoundStableStrategy',
    type: StrategyTypes.COMPOUND,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Compound.cDAI,
      strategyName: 'CompoundStableStrategyDAI',
    },
    config,
  },

  CompoundLeverageStrategyETH: {
    contract: 'CompoundLeverageStrategyETH',
    type: StrategyTypes.COMPOUND_LEVERAGE,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Compound.cETH,
      strategyName: 'CompoundLeverageStrategyETH',
    },
    config,
  },

  CompoundLeverageStrategyUNI: {
    contract: 'CompoundLeverageStrategy',
    type: StrategyTypes.COMPOUND_LEVERAGE,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Compound.cUNI,
      strategyName: 'CompoundLeverageStrategyUNI',
    },
    config,
  },

  CompoundLeverageStrategyLINK: {
    contract: 'CompoundLeverageStrategy',
    type: StrategyTypes.COMPOUND_LEVERAGE,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Compound.cLINK,
      strategyName: 'CompoundLeverageStrategyLINK',
    },
    config,
  },

  CompoundXYStrategyETH: {
    contract: 'CompoundXYStrategyETH',
    type: StrategyTypes.COMPOUND_XY,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Compound.cETH,
      borrowCToken: Address.Compound.cWBTC,
      strategyName: 'CompoundXYStrategyETH',
    },
    config,
  },

  RariFuseStrategy: {
    contract: 'RariFuseStrategy',
    type: StrategyTypes.RARI_FUSE,
    constructorArgs: {
      swapManager,
      fusePoolId: 23, // default
      strategyName: 'RariFuseStrategy',
    },
    config,
  },

  RariFuseStrategyETH: {
    contract: 'RariFuseStrategyETH',
    type: StrategyTypes.RARI_FUSE,
    constructorArgs: {
      swapManager,
      fusePoolId: 23, // default
      strategyName: 'RariFuseStrategyETH',
    },
    config,
  },
  EarnRariFuseStrategy: {
    contract: 'EarnRariFuseStrategy',
    type: StrategyTypes.EARN_RARI_FUSE,
    constructorArgs: {
      swapManager,
      fusePoolId: 23, // default,
      dripToken: Address.DAI,
      strategyName: 'EarnRariFuseStrategy',
    },
    config,
  },

  EarnRariFuseStrategyETH: {
    contract: 'EarnRariFuseStrategyETH',
    type: StrategyTypes.EARN_RARI_FUSE,
    constructorArgs: {
      swapManager,
      fusePoolId: 23, // default
      dripToken: Address.DAI,
      strategyName: 'EarnRariFuseStrategyETH',
    },
    config,
  },

  AlphaLendStrategyDAI: {
    contract: 'AlphaLendStrategy',
    type: StrategyTypes.ALPHA_LEND,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Alpha.ibDAIv2,
      strategyName: 'AlphaLendStrategyDAI',
    },
    config,
  },

  AlphaLendStrategyDPI: {
    contract: 'AlphaLendStrategy',
    type: StrategyTypes.ALPHA_LEND,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Alpha.ibDPIv2,
      strategyName: 'AlphaLendStrategyDPI',
    },
    config,
  },

  AlphaLendStrategyETH: {
    contract: 'AlphaLendStrategyETH',
    type: StrategyTypes.ALPHA_LEND,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Alpha.ibETHv2,
      strategyName: 'AlphaLendStrategyETH',
    },
    config,
  },

  AlphaLendStrategyLINK: {
    contract: 'AlphaLendStrategy',
    type: StrategyTypes.ALPHA_LEND,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Alpha.ibLINKv2,
      strategyName: 'AlphaLendStrategyLINK',
    },
    config,
  },

  AlphaLendStrategyUSDC: {
    contract: 'AlphaLendStrategy',
    type: StrategyTypes.ALPHA_LEND,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Alpha.ibUSDCv2,
      strategyName: 'AlphaLendStrategyUSDC',
    },
    config: { interestFee, debtRatio: 0, debtRate: ethers.utils.parseUnits('1000000', 6) },
  },

  AlphaLendStrategyUSDT: {
    contract: 'AlphaLendStrategy',
    type: StrategyTypes.ALPHA_LEND,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Alpha.ibUSDTv2,
      strategyName: 'AlphaLendStrategyUSDT',
    },
    config: { interestFee, debtRatio: 0, debtRate: ethers.utils.parseUnits('1000000', 6) },
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
    config,
  },

  Convex2PoolStrategyMIMUSTPoolMIM: {
    contract: 'Convex2PoolStrategyMIMUSTPool',
    type: StrategyTypes.CURVE,
    constructorArgs: {
      swapManager,
      collateralIdx: 0,
      strategyName: 'Convex2PoolStrategyMIMUSTPoolMIM',
    },
    config,
  },

  Convex3PoolStrategyDAI: {
    contract: 'Convex3PoolStrategy',
    type: StrategyTypes.CURVE,
    constructorArgs: {
      swapManager,
      collateralIdx: 0,
      strategyName: 'Convex3PoolStrategyDAI',
    },
    config,
  },

  ConvexCoverage3poolStrategyDAI: {
    contract: 'ConvexCoverage3poolStrategy',
    type: StrategyTypes.CURVE,
    constructorArgs: {
      swapManager,
      collateralIdx: 0,
      strategyName: 'ConvexCoverage3poolStrategyDAI',
    },
    config,
  },

  ConvexStable3PoolStrategyDAI: {
    contract: 'ConvexStable3PoolStrategy',
    type: StrategyTypes.CURVE,
    constructorArgs: {
      swapManager,
      collateralIdx: 0,
      strategyName: 'ConvexStable3PoolStrategyDAI',
    },
    config,
  },

  ConvexSBTCPoolStrategyWBTC: {
    contract: 'ConvexSBTCPoolStrategy',
    type: StrategyTypes.CURVE,
    constructorArgs: {
      swapManager,
      collateralIdx: 1,
      strategyName: 'ConvexSBTCPoolStrategyWBTC',
    },
    config: { interestFee, debtRatio: 0, debtRate: ethers.utils.parseUnits('1000000', 8) },
  },

  Convex4MetaPoolStrategyMIMPoolMIM: {
    contract: 'Convex4MetaPoolStrategyMIMPool',
    type: StrategyTypes.CURVE,
    constructorArgs: {
      swapManager,
      collateralIdx: 0,
      strategyName: 'Convex4MetaPoolStrategyMIMPoolMIM',
    },
    config,
  },

  Convex4PoolStrategySUSDPoolDAI: {
    contract: 'Convex4PoolStrategySUSDPool',
    type: StrategyTypes.CURVE,
    constructorArgs: {
      swapManager,
      collateralIdx: 0,
      strategyName: 'Convex4PoolStrategySUSDPoolDAI',
    },
    config,
  },

  Crv2PoolStrategyMIMUSTPoolMIM: {
    contract: 'Crv2PoolStrategyMIMUSTPool',
    type: StrategyTypes.CURVE,
    constructorArgs: {
      swapManager,
      collateralIdx: 0,
      strategyName: 'Crv2PoolStrategyMIMUSTPoolMIM',
    },
    config,
  },

  Crv3PoolStrategyDAI: {
    contract: 'Crv3PoolStrategy',
    type: StrategyTypes.CURVE,
    constructorArgs: {
      swapManager,
      collateralIdx: 0,
      strategyName: 'Crv3PoolStrategyDAI',
    },
    config,
  },

  Crv3PoolStrategyUSDC: {
    contract: 'Crv3PoolStrategy',
    type: StrategyTypes.CURVE,
    constructorArgs: {
      swapManager,
      collateralIdx: 1,
      strategyName: 'Crv3PoolStrategyUSDC',
    },
    config: { interestFee, debtRatio: 0, debtRate: ethers.utils.parseUnits('1000000', 6) },
  },

  CrvSBTCPoolStrategyWBTC: {
    contract: 'CrvSBTCPoolStrategy',
    type: StrategyTypes.CURVE,
    constructorArgs: {
      swapManager,
      collateralIdx: 1,
      strategyName: 'CrvSBTCPoolStrategyWBTC',
    },
    config: { interestFee, debtRatio: 0, debtRate: ethers.utils.parseUnits('1000000', 8) },
  },

  EarnCrvSBTCPoolStrategyWBTC: {
    contract: 'EarnCrvSBTCPoolStrategy',
    type: StrategyTypes.EARN_CURVE,
    constructorArgs: {
      swapManager,
      dripToken: Address.DAI,
      strategyName: 'EarnCrvSBTCPoolStrategyWBTC',
    },
    config,
  },

  Crv4MetaPoolStrategyMIMPoolDAI: {
    contract: 'Crv4MetaPoolStrategyMIMPool',
    type: StrategyTypes.CURVE,
    constructorArgs: {
      swapManager,
      collateralIdx: 1,
      strategyName: 'Crv4MetaPoolStrategyMIMPoolDAI',
    },
    config,
  },

  Crv4MetaPoolStrategyMIMPoolMIM: {
    contract: 'Crv4MetaPoolStrategyMIMPool',
    type: StrategyTypes.CURVE,
    constructorArgs: {
      swapManager,
      collateralIdx: 0,
      strategyName: 'Crv4MetaPoolStrategyMIMPoolMIM',
    },
    config,
  },

  Crv4PoolStrategySUSDPoolDAI: {
    contract: 'Crv4PoolStrategySUSDPool',
    type: StrategyTypes.CURVE,
    constructorArgs: {
      swapManager,
      collateralIdx: 0,
      strategyName: 'Crv4PoolStrategySUSDPoolDAI',
    },
    config,
  },

  CrvA3PoolStrategyDAI: {
    contract: 'CrvA3PoolStrategy',
    type: StrategyTypes.CURVE,
    constructorArgs: {
      swapManager,
      collateralIdx: 0,
      strategyName: 'CrvA3PoolStrategyDAI',
    },
    config,
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
    config,
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
    config,
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
    config,
  },

  VesperMakerStrategyETH: {
    contract: 'VesperMakerStrategy',
    type: StrategyTypes.VESPER_MAKER,
    constructorArgs: {
      swapManager,
      receiptToken: Address.vaDAI,
      collateralType: ethers.utils.formatBytes32String('ETH-C'),
      strategyName: 'VesperMakerStrategyETH',
    },
    config,
  },

  VesperMakerStrategyLINK: {
    contract: 'VesperMakerStrategy',
    type: StrategyTypes.VESPER_MAKER,
    constructorArgs: {
      swapManager,
      receiptToken: Address.vaDAI,
      collateralType: ethers.utils.formatBytes32String('LINK-A'),
      strategyName: 'VesperMakerStrategyLINK',
    },
    config,
  },

  VesperMakerStrategyWBTC: {
    contract: 'VesperMakerStrategy',
    type: StrategyTypes.VESPER_MAKER,
    constructorArgs: {
      swapManager,
      receiptToken: Address.vaDAI,
      collateralType: ethers.utils.formatBytes32String('WBTC-A'),
      strategyName: 'VesperMakerStrategyWBTC',
    },
    config,
  },

  EarnAaveMakerStrategyETH: {
    contract: 'EarnAaveMakerStrategy',
    type: StrategyTypes.EARN_MAKER,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Aave.aDAI,
      collateralType: ethers.utils.formatBytes32String('ETH-C'),
      dripToken: Address.DAI,
      strategyName: 'EarnAaveMakerStrategyETH',
    },
    config,
  },

  EarnCompoundMakerStrategyETH: {
    contract: 'EarnCompoundMakerStrategy',
    type: StrategyTypes.EARN_MAKER,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Compound.cDAI,
      collateralType: ethers.utils.formatBytes32String('ETH-C'),
      dripToken: Address.DAI,
      strategyName: 'EarnCompoundMakerStrategyETH',
    },
    config,
  },

  EarnVesperMakerStrategyETH: {
    contract: 'EarnVesperMakerStrategy',
    type: StrategyTypes.EARN_VESPER_MAKER,
    constructorArgs: {
      swapManager,
      receiptToken: Address.vaDAI,
      collateralType: ethers.utils.formatBytes32String('ETH-C'),
      dripToken: Address.DAI,
      strategyName: 'EarnVesperMakerStrategyETH',
    },
    config,
  },

  EarnVesperMakerStrategyLINK: {
    contract: 'EarnVesperMakerStrategy',
    type: StrategyTypes.EARN_VESPER_MAKER,
    constructorArgs: {
      swapManager,
      receiptToken: Address.vaDAI,
      collateralType: ethers.utils.formatBytes32String('LINK-A'),
      dripToken: Address.DAI,
      strategyName: 'EarnVesperMakerStrategyLINK',
    },
    config,
  },

  EarnVesperMakerStrategyWBTC: {
    contract: 'EarnVesperMakerStrategy',
    type: StrategyTypes.EARN_VESPER_MAKER,
    constructorArgs: {
      swapManager,
      receiptToken: Address.vaDAI,
      collateralType: ethers.utils.formatBytes32String('WBTC-A'),
      dripToken: Address.DAI,
      strategyName: 'EarnVesperMakerStrategyWBTC',
    },
    config,
  },

  EarnVesperStrategyDAIDPI: {
    contract: 'EarnVesperStrategy',
    type: StrategyTypes.EARN_VESPER,
    constructorArgs: {
      swapManager,
      receiptToken: Address.vaDAI,
      dripToken: Address.DPI,
      strategyName: 'EarnVesperStrategyDAIDPI',
    },
    config,
  },

  EarnVesperStrategyDAILINK: {
    contract: 'EarnVesperStrategy',
    type: StrategyTypes.EARN_VESPER,
    constructorArgs: {
      swapManager,
      receiptToken: Address.vaDAI,
      dripToken: Address.LINK,
      strategyName: 'EarnVesperStrategyDAILINK',
    },
    config,
  },

  EarnVesperStrategyDAIVSP: {
    contract: 'EarnVesperStrategyVSPDrip',
    type: StrategyTypes.EARN_VESPER,
    constructorArgs: {
      swapManager,
      receiptToken: Address.vaDAI,
      dripToken: Address.VSP,
      strategyName: 'EarnVesperStrategyDAIVSP',
    },
    config,
  },

  EarnVesperStrategyDAIWBTC: {
    contract: 'EarnVesperStrategy',
    type: StrategyTypes.EARN_VESPER,
    constructorArgs: {
      swapManager,
      receiptToken: Address.vaDAI,
      dripToken: Address.WBTC,
      strategyName: 'EarnVesperStrategyDAIWBTC',
    },
    config,
  },

  EarnVesperStrategyDAIWETH: {
    contract: 'EarnVesperStrategy',
    type: StrategyTypes.EARN_VESPER,
    constructorArgs: {
      swapManager,
      receiptToken: Address.vaDAI,
      dripToken: Address.WETH,
      strategyName: 'EarnVesperStrategyDAIWETH',
    },
    config,
  },

  VesperCoverageStrategyDAI: {
    contract: 'VesperCoverageStrategy',
    type: StrategyTypes.VESPER,
    constructorArgs: {
      swapManager,
      receiptToken: Address.vaDAI,
      strategyName: 'VesperCoverageStrategyDAI',
    },
    config,
  },

  VesperStableStrategyDAI: {
    contract: 'VesperStableStrategy',
    type: StrategyTypes.VESPER,
    constructorArgs: {
      swapManager,
      receiptToken: Address.vaDAI,
      strategyName: 'VesperStableStrategyDAI',
    },
    config,
  },

  YearnStrategyDAI: {
    contract: 'YearnStrategy',
    type: StrategyTypes.YEARN,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Yearn.yvDAI,
      strategyName: 'YearnStrategyDAI',
    },
    config,
  },

  YearnStrategyUSDC: {
    contract: 'YearnStrategy',
    type: StrategyTypes.YEARN,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Yearn.yvUSDC,
      strategyName: 'YearnStrategyUSDC',
    },
    config: { interestFee, debtRatio: 0, debtRate: ethers.utils.parseUnits('1000000', 6) },
  },

  EarnYearnStrategyETH: {
    contract: 'EarnYearnStrategy',
    type: StrategyTypes.EARN_YEARN,
    constructorArgs: {
      swapManager,
      receiptToken: Address.Yearn.yvWETH,
      dripToken: Address.DAI,
      strategyName: 'EarnYearnStrategyETH',
    },
    config,
  },
}

module.exports = Object.freeze(StrategyConfig)
