# Pally Coin Smart Contract

This is the app that hold the smart contract of the Pally Coin Token in order to
have a secure version control of its development.

# How to test the contracts

1. Open a testrpc with the following command to have enough ether to use for each account:

```
testrpc -b 1 --network-id 1337 -m "mixed acquire scout balcony tonight stadium whisper medal finger pause file universe" --account "0x151389fe91ca4d570c5a094a086da85e6f0d79258ff3e37256fdf6d3a38465a0, 1000000000000000000000000000" --account "0xd833592c71df690e7a9ef5e27edb6e3343036e1b3cbaf517b4e57d1d1b47365e, 1000000000000000000000000000" --account "0x9b43c97e09c1824bbcf76a3b4ea66a3cda64560aa8760f8490f2273db044d1ff, 1000000000000000000000000000" --account "0x0fe3cc61f49590bf9b22d15cf2e52d486fb80dcc44ff5c591a84a2ec74d95fe7, 1000000000000000000000000000" --account "0x7dd1a316c769be0077d181c797d8ddba2a74b9b736f5683539bc67f55fbb1258, 1000000000000000000000000000" --account "0xcabdbeb127133973e423f386029844600d2caf8a6cf38491828a126958b2f472, 1000000000000000000000000000" --account "0x3d8e1ece39b0a6a75076a45d1d2f7231f7642827367e6b961be0a1892b5a2cf7, 1000000000000000000000000000" --account "0xe20f826f8af3afe319cba2109a116beee93c16ddbe000306d5951ee1f3ffdaeb, 1000000000000000000000000000" --account "0x4d562480030fcf069d6348011395d03e06f5a2dda9e824ce00f09586850e1973, 1000000000000000000000000000" --account "0x767c58015a0b9523d4b34108336405a4dad528a735767b12ca37a74053336c12, 1000000000000000000000000000"
```

That command will use a specific mnemonic with 9 accounts and 100.000.000 ether for each one. It'll also mine the transactions by using -b 1.
Make sure to have enought ether when testing the contract, i.e. restart testrpc often to regenerate the ether for all the accounts.

2. Go to the outter project folder and execute the command:

```
truffle test
```

3. Wait until all tests are done.

## Testing results

The contracts `PallyCoin` and `Crowdsale` each have tests to make sure all the functions work as expected.
There's a total of 23 tests at the moment of writing this. They cover most of the possible use cases.

![tests passing demonstration](https://raw.githubusercontent.com/merlox/pally/master/contract tests demonstraction.png)
