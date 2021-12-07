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
      receiptToken: Address.Aave.aUSDCV1,
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
    type: StrategyTypes.RARI_FUSE,
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
    type: StrategyTypes.RARI_FUSE,
    constructorArgs: {
      swapManager,
      fusePoolId: 23, // default
      dripToken: Address.DAI,
      strategyName: 'EarnRariFuseStrategyETH',
    },
    config,
  },
}

module.exports = Object.freeze(StrategyConfig)
