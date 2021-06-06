# simple-payment-channel
A simple unidirectional payment channel implemented with Solidity and Truffle.

## How to run
Install truffle globally beforehand.

Then, install the dependencies and run the tests.

```
npm install
truffle test
```

## Referenced tutorial and project
1. https://programtheblockchain.com/posts/2018/02/23/writing-a-simple-payment-channel/
2. https://github.com/luisvid/simple-payment-channel

## Issue about the `v` value

At first, I refered to most of the code of https://github.com/luisvid/simple-payment-channel. Though a valid signature can be verified to be correct by the local JS test scripts, it was seen invalid by the Solidity contract. After some searching, finally I found out that after adding `27` to the `v` value after splitting the signature, the Solidity contract finally accepted the signature.

Originally, function `recoverSigner` is:

```solidity
function recoverSigner(bytes32 message, bytes memory sig)
    internal
    pure
    returns (address)
{
    uint8 v;
    bytes32 r;
    bytes32 s;

    (v, r, s) = splitSignature(sig);

    return ecrecover(message, v, r, s);
}
```

In order to add `27` to `v`, change it to:

```solidity
function recoverSigner(bytes32 message, bytes memory sig)
    internal
    pure
    returns (address)
{
    uint8 v;
    bytes32 r;
    bytes32 s;

    (v, r, s) = splitSignature(sig);

    if (v < 27) {
        v += 27;
    }

    return ecrecover(message, v, r, s);
}
```

The reason is the inconsistency of the Solidity and web3 API. According to https://medium.com/mycrypto/the-magic-of-digital-signatures-on-ethereum-98fe184dc9c7, the `v` value for message signatures in Ethereum is always `27` or `28` (which is internally `0` or `1`, and `27` is added to be consistent with Bitcoin). This is also the Solidity standard for `ecrecover`.

However, when signing the message using web3 API, `eth_sign` does not add `27` to the `v`, according to https://github.com/ethereum/go-ethereum/pull/2940#issuecomment-242118515, so you have to do that manually.

As for why the original project (https://github.com/luisvid/simple-payment-channel) did not add 27, from my speculation, the reason might be the behavior change of geth (https://ethereum.stackexchange.com/a/64390).

---

BTW, https://eips.ethereum.org/EIPS/eip-155 is an interesting post about the `v` value for transaction signature instead of message signature, which is not related to this issue though.
