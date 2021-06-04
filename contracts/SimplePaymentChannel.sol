pragma solidity ^0.5.17;

contract SimplePaymentChannel {
    address payable public sender;
    address payable public recipient;
    uint256 public expiration;

    constructor(address payable _recipient, uint256 duration) public payable {
        sender = msg.sender;
        recipient = _recipient;
        expiration = now + duration;
    }

    function prefixed(bytes32 _hash) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked("\x19Ethereum Signed Message:\n32", _hash)
            );
    }

    function splitSignature(bytes memory sig)
        internal
        pure
        returns (
            uint8,
            bytes32,
            bytes32
        )
    {
        require(sig.length == 65);

        uint8 v;
        bytes32 r;
        bytes32 s;

        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }

        return (v, r, s);
    }

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

    function isValidSignature(uint256 amount, bytes memory signature)
        public
        view
        returns (bool)
    {
        bytes32 message =
            prefixed(keccak256(abi.encodePacked(address(this), amount)));
        return recoverSigner(message, signature) == sender;
    }

    function close(uint256 amount, bytes memory signature) public {
        require(msg.sender == recipient);
        require(
            isValidSignature(amount, signature),
            "invalid amount and signature pair"
        );

        recipient.transfer(amount);
        selfdestruct(sender);
    }

    function claimTimeout() public {
        require(now >= expiration);
        selfdestruct(sender);
    }
}
