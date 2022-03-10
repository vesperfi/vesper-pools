# Vesper Pools

Please read and get familiar with [Vesper](https://docs.vesper.finance/). This repository contains set of smart contracts and test cases of Vesper pools.

## Setup

1. Install

   ```sh
   git clone --recursive https://github.com/vesperfi/vesper-pools-v3.git
   cd vesper-pools-v3
   nvm use
   npm install
   ```
2. set NODE_URL in env
    ```sh
    export NODE_URL=<eth mainnet url>
    ```
3. Compile

   ```sh
   npm run compile
   ```
4. Test

Note: These tests will fork the mainnet as required in step 3. It is not recommended to run all tests at once, but rather to specify a single file.

  - Run single file
   ```sh
   npm test test/veth/aave-maker-compound-maker.js
   ```

  - Or run them all (but some will fail, because of state modifications to the forked chain)
   ```sh
   npm test
   ```

## Run test with coverage

Coverage will launch its own in-process ganache server, so all you need to run is below command.
```sh
npm run coverage
```
Coverage for one file
```
npm run coverage -- --testfiles "<<filename>>"
```
## Deploy

Deployment will be done via custom `hardhat task deploy-pool` which behind the scene uses deploy scripts created using `hardhat-deploy`
### Usage
* Help
   ```bash
   npx hardhat help deploy-pool
   ```

* Deploy Vesper pool
  1. Add pool configuration in `./helper/mainnet/poolConfig.js` file.
     - Some default config for setup and rewards are already defined at top of file, override them as needed.
     - Replace mainnet in `./helper/mainnet/poolConfig.js` with arbitrum/avalanche/polygon as needed.

   Example configuration for `VDAI`
    ```js
     VDAI: {
      contractName: 'VPool',
      poolParams: ['vDAI Pool', 'vDAI', Address.DAI],
      setup: { ...setup },
      rewards: { ...rewards },
    },
    ```

  
  2. Run below command to deploy pool on localhost and mainnet as target chain
  ```bash
   npm run deploy -- --pool VDAI --network localhost --deploy-params '{"tags": "deploy-vPool"}'
  ```
  - To deploy pool on localhost and polygon as target chain, run below command 
  ```bash 
  npm run deploy -- --pool VDAI --network localhost --deploy-params '{"tags": "deploy-vPool"}' --target-chain polygon
  ```

* Deploy pool with release (preferred)
  - It will create `contracts.json` file at `/releases/3.0.15`
  ```bash
   npm run deploy -- --pool VDAI --network localhost --release 3.0.15 --deploy-params '{"tags": "deploy-vPool"}'
  ``` 

* Deploy strategy for already deployed pool
  1. Add strategy configuration in `./helper/mainnet/strategyConfig.js` file.
   
   Example configuration for `AaveStrategyDAI`
   ```js
     AaveStrategyDAI: {
      contract: 'AaveStrategy',
      type: StrategyTypes.AAVE,
      constructorArgs: {
        swapManager,
        receiptToken: Address.Aave.aDAI,
        strategyName: 'AaveStrategyDAI',
      },
      config: { ...config },
      setup: { ...setup },
    },
   ```
  2. Run below command to deploy `AaveStrategyDAI` for `VDAI` pool
  ```bash
  npm run deploy -- --pool VDAI --network localhost --release 3.0.15 --deploy-params '{"tags": "deploy-strategy"}' --strategy-name AaveStrategyDAI
  ```

* Migrate strategy
  ```bash
  npm run deploy -- --pool VDAI --network localhost --release 3.0.15 --deploy-params '{"tags": "migrate-strategy"}' --strategy-name AaveStrategyDAI
  ```

* Pass any `hardhat-deploy` supported param within `deploy-params` object
  ```bash
   npm run deploy -- --pool VDAI --network localhost --release 3.0.15 --deploy-params '{"tags": "deploy-vPool", "gasprice": "25000000000"}'
  ```

 ```

 * Deploy `upgrader` contracts 
  mandatory param `name`, supported values : `PoolAccountantUpgrader`, `PoolRewardsUpgrader`, `VPoolUpgrader`
  optional param `--target-chain`, values :  `polygon`, `mainnet`, `avalanche`, `arbitrium`
 
 ```bash
  npm run deploy-upgrader -- --name PoolAccountantUpgrader --network localhost
  npm run deploy-upgrader -- --name PoolRewardsUpgrader --network localhost --target-chain polygon
 ```

 * Deploy `vfr` pool
 VFR Pool pair require Coverage, Stable pool and VFRBuffer contract. Refer `VFRDAI` config section in `poolConfig.js` file.
 ```bash
  npm run deploy -- --pool VFRDAI --network localhost --target-chain mainnet --release 3.0.15 --deploy-params '{"tags": "deploy-vfr", "gasprice": "25000000000"}'
 ```
