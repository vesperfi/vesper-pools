# OpenZeppelin Dependencies for Vesper pools

Due to proxy support in Vesper pools, we do not want to update upstream contracts via npm/package.json dependency hence we have added local copy of contracts we are using from openZeppelin.
If/when needed we will review upstream code and update local copy.


### Version

| contract                                               | version |
| ------------------------------------------------------ | ------- |
| openzeppelin/contracts/utils/structs/EnumerableSet.sol | 4.3.0   |
| Remaining contracts                                    | 4.1.0   |