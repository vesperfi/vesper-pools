'use strict'
const Address = {
  ZERO: '0x0000000000000000000000000000000000000000',
  DAI: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
  ANY_ERC20: '0x104592a158490a9228070E0A8e5343B499e125D0', // FRAX
  SUSHI_ROUTER: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506', // SushiSwap router
  NATIVE_TOKEN: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // WMATIC
  USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
  USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
  WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
  WBTC: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6',
  WMATIC: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
  CRV: '0x172370d5cd63279efa6d502dab29171933a610af',
  MULTICALL: '0x11ce4B23bD875D7F5C6a31084f55fDe1e9A87507',
  Aave: {
    amDAI: '0x27F8D03b3a2196956ED754baDc28D73be8830A6e',
    amUSDC: '0x1a13F4Ca1d028320A707D99520AbFefca3998b7F',
    amUSDT: '0x60D55F02A771d515e077c9C2403a1ef324885CeC',
    amWBTC: '0x5c2ed810328349100A66B82b78a1791B101C9D61',
    amWETH: '0x28424507fefb6f7f8E9D3860F56504E4e5f5f390',
    amWMATIC: '0x8dF3aad3a84da6b69A4DA8aeC3eA40d9091B2Ac4',
  },
  Vesper: {
    ADDRESS_LIST_FACTORY: '0xD10D5696A350D65A9AA15FE8B258caB4ab1bF291',
    DEPLOYER: '0xB5AbDABE50b5193d4dB92a16011792B22bA3Ef51',
    FEE_COLLECTOR: '0xdf826ff6518e609E4cEE86299d40611C148099d5',
    KEEPER: '0xdf826ff6518e609E4cEE86299d40611C148099d5',
    MULTICALL: '0x11ce4B23bD875D7F5C6a31084f55fDe1e9A87507',
    SWAP_MANAGER: '0xefe48370DB8f8Ee343f4f24Ee0B09cC4A8FC3D76',
    vDAI: '0x0701bfE50Ca516140E047Ea53388DD6B8f3DB557',
    VSP: '0x09C5a4BCA808bD1ba2b8E6B3aAF7442046B4ca5B',
    vWBTC: '0x36366EA27B777622017d3583060ee64BB49eDbE5',
    vWETH: '0xD66FDcA0b120427C90C0318a454b37B88a3Aa40F',
  },
  MultiSig: {
    safe: '0xbbeC498b8B8A403446E31777B7F906Fe451d7Ef1',
  },
}

module.exports = Object.freeze(Address)
