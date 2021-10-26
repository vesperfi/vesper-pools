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
   npm test test/veth/aave_maker-compound_maker.js
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
* Deploy VDAI pool
  ```bash
   npm run deploy -- --pool VDAI --network localhost
   or
   npx hardhat deploy-pool --pool VDAI --network localhost
  ```

* Deploy VDAI pool with release (preferred)
  
  ```bash
   npm run deploy -- --pool VDAI --network localhost --release 3.0.5
  ```
  > It will create `contracts.json` file at `/releases/3.0.5`

* Passing any `hardhat-deploy` param
  ```bash
   npm run deploy -- --pool VDAI --network localhost --release 3.0.5 -- deploy-params '{"tags": "VDAI", gasprice: "25000000000"}'
  ```
