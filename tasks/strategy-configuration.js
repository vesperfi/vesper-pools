'use strict'

/* eslint-disable no-param-reassign, complexity */
task('strategy-configuration', 'Prepare strategy configuration for deployment')
  .addOptionalParam(
    'strategyParams',
    `any param passed inside strategyParam object will be used to prepare strategy configuration
  -----------------------------------------------------------------------------------------
  name                strategy contract name
  collateralToken     name of pool collateral token
  interestFee         interest fee of this strategy
  debtRatio           debt ratio for this strategy
  debtRate            debt rate of this strategy
  swapManager         swap manager address
  addressListFactory  factory address
  feeCollector        fee collector address
  keeper              address we want to add as keeper
  fusePoolId          Fuse pool id, if applicable
  -----------------------------------------------------------------------------------------
  `,
  )
  .setAction(async function ({ strategyParams }) {
    // Parse string data as JSON
    if (typeof strategyParams === 'string') {
      strategyParams = JSON.parse(strategyParams)
    } else {
      // not deploying strategy
      hre.strategyConfig = {}
      return
    }
    // Make sure collateral token name is provided
    if (!strategyParams.collateralToken) {
      throw new Error('CollateralToken is missing in strategy configuration data')
    }

    const poolConfig = hre.poolConfig
    let tokenSymbol = 'ETH'
    let tokenDecimal = 18

    // If 3rd param exist, overwrite symbol and decimal.
    if (poolConfig.poolParams[2]) {
      const token = await ethers.getContractAt('ERC20', poolConfig.poolParams[2])
      tokenSymbol = await token.symbol()
      tokenDecimal = await token.decimals()
    }

    // Make sure pool and strategy config has same collateral
    if (tokenSymbol.toUpperCase() !== strategyParams.collateralToken.toUpperCase()) {
      throw new Error('Collateral token mismatch')
    }

    const hreNetwork = hre.network.name
    const helperNetwork = hreNetwork === 'localhost' ? 'mainnet' : hreNetwork
    const Address = require(`../helper/${helperNetwork}/address`)

    // Prepare strategy configuration for deployment
    const strategyConfig = {
      contractName: strategyParams.name,
      swapManager: strategyParams.swapManager ? strategyParams.swapManager : Address.SWAP_MANAGER,
      addressListFactory: strategyParams.addressListFactory
        ? strategyParams.addressListFactory
        : Address.ADDRESS_LIST_FACTORY,
      keeper: strategyParams.keeper ? strategyParams.keeper : Address.KEEPER,
      feeCollector: strategyParams.feeCollector ? strategyParams.feeCollector : Address.FEE_COLLECTOR,
      interestFee: strategyParams.interestFee ? strategyParams.interestFee : '1500',
      debtRatio: strategyParams.debtRatio ? strategyParams.debtRatio : '0',
      debtRate: strategyParams.debtRate
        ? strategyParams.debtRate
        : ethers.utils.parseUnits('1000000', tokenDecimal).toString(),
    }

    if (strategyParams.fusePoolId) {
      strategyConfig.fusePoolId = strategyParams.fusePoolId
    }

    console.log(`Deploying ${strategyParams.name} on ${hreNetwork} with following configuration: `, strategyConfig)

    // Set configuration in hre
    hre.strategyConfig = strategyConfig
  })

module.exports = {}
