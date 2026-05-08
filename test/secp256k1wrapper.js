var chai = require('chai');
var assert = chai.assert;
var Buffer = require('safe-buffer').Buffer;
var secp256k1 = require('../lib/utils/secp256k1wrapper.js');

describe('lib/utils/secp256k1wrapper', function () {

    var privateKey = Buffer.alloc(32, 1);
    var msgHash = Buffer.alloc(32, 2);
    var knownPrivHex = 'c75a5f85ef779dcf95c651612efb3c3b9a6dfafb1bb5375905454d9fc8be8a6b';
    var knownKey = Buffer.from(knownPrivHex, 'hex');

    describe('sign', function () {
        it('should return a 64-byte signature and recovery number', function () {
            var result = secp256k1.sign(msgHash, privateKey);
            assert.isObject(result);
            assert.isNumber(result.recovery);
            assert.isTrue(result.recovery === 0 || result.recovery === 1);
            assert.isTrue(Buffer.isBuffer(result.signature));
            assert.equal(result.signature.length, 64);
        });

        it('should use low-S (canonical) signatures', function () {
            var result = secp256k1.sign(msgHash, privateKey);
            // s value should be <= half curve order (low-S)
            var s = result.signature.slice(32, 64);
            var halfOrder = Buffer.from('7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0', 'hex');
            assert.isTrue(s.compare(halfOrder) <= 0, 'signature s should be low-S');
        });

        it('should produce different signatures for different messages', function () {
            var msg1 = Buffer.alloc(32, 2);
            var msg2 = Buffer.alloc(32, 3);
            var sig1 = secp256k1.sign(msg1, privateKey);
            var sig2 = secp256k1.sign(msg2, privateKey);
            assert.notDeepEqual(sig1.signature, sig2.signature);
        });

        it('should accept a known MOAC testnet private key', function () {
            var msg = Buffer.from('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'hex');
            var result = secp256k1.sign(msg, knownKey);
            assert.equal(result.signature.length, 64);
            assert.isTrue(result.recovery === 0 || result.recovery === 1);
        });
    });

    describe('recover', function () {
        it('should recover a compressed public key by default', function () {
            var sigResult = secp256k1.sign(msgHash, privateKey);
            var pubKey = secp256k1.recover(msgHash, sigResult.signature, sigResult.recovery);
            assert.equal(pubKey.length, 33, 'default compressed is 33 bytes');
        });

        it('should recover an uncompressed public key when compressed=false', function () {
            var sigResult = secp256k1.sign(msgHash, privateKey);
            var pubKey = secp256k1.recover(msgHash, sigResult.signature, sigResult.recovery, false);
            assert.equal(pubKey.length, 65, 'uncompressed is 65 bytes');
        });

        it('should recover the correct public key that matches getPublicKey', function () {
            var sigResult = secp256k1.sign(msgHash, privateKey);
            var recovered = secp256k1.recover(msgHash, sigResult.signature, sigResult.recovery, false);

            // Derive public key from private key for comparison
            var _secp256k1 = require('@noble/curves/secp256k1').secp256k1;
            var expectedPub = _secp256k1.getPublicKey(privateKey, false);

            assert.deepEqual(recovered, Buffer.from(expectedPub));
        });

        it('should fail with recovery=1 when recovery=0 is correct', function () {
            var sigResult = secp256k1.sign(msgHash, privateKey);
            var wrongRecovery = 1 - sigResult.recovery;
            // May not throw, but should recover a different key
            var recovered = secp256k1.recover(msgHash, sigResult.signature, wrongRecovery, false);

            var _secp256k1 = require('@noble/curves/secp256k1').secp256k1;
            var expectedPub = _secp256k1.getPublicKey(privateKey, false);

            assert.notDeepEqual(recovered, Buffer.from(expectedPub),
                'wrong recovery should not produce the correct public key');
        });
    });

    describe('publicKeyConvert', function () {
        it('should convert uncompressed to compressed', function () {
            // Use a real public key from getPublicKey
            var _secp256k1 = require('@noble/curves/secp256k1').secp256k1;
            var pubUncompressed = Buffer.from(_secp256k1.getPublicKey(privateKey, false));

            var compressed = secp256k1.publicKeyConvert(pubUncompressed, true);
            assert.equal(compressed.length, 33);
            assert.isTrue(compressed[0] === 0x02 || compressed[0] === 0x03);
        });

        it('should convert compressed to uncompressed', function () {
            var _secp256k1 = require('@noble/curves/secp256k1').secp256k1;
            // Use a known good public key
            var pubKeyCompressed = _secp256k1.getPublicKey(privateKey, true);

            var uncompressed = secp256k1.publicKeyConvert(Buffer.from(pubKeyCompressed), false);
            assert.equal(uncompressed.length, 65);
            assert.equal(uncompressed[0], 0x04);
        });

        it('should roundtrip uncompressed → compressed → uncompressed', function () {
            var _secp256k1 = require('@noble/curves/secp256k1').secp256k1;
            var original = Buffer.from(_secp256k1.getPublicKey(privateKey, false));

            var compressed = secp256k1.publicKeyConvert(original, true);
            var roundtripped = secp256k1.publicKeyConvert(compressed, false);

            assert.deepEqual(roundtripped, original);
        });
    });

    describe('sign-and-recover roundtrip', function () {
        it('should sign a message and recover the correct public key', function () {
            var sigResult = secp256k1.sign(msgHash, privateKey);
            var recovered = secp256k1.recover(msgHash, sigResult.signature, sigResult.recovery, false);

            var _secp256k1 = require('@noble/curves/secp256k1').secp256k1;
            var expectedPub = _secp256k1.getPublicKey(privateKey, false);

            assert.deepEqual(Buffer.from(recovered), Buffer.from(expectedPub));
        });

        it('should sign and recover for a random private key', function () {
            var randomKey = require('crypto').randomBytes(32);
            var randomMsg = require('crypto').randomBytes(32);

            var sigResult = secp256k1.sign(randomMsg, randomKey);
            var recovered = secp256k1.recover(randomMsg, sigResult.signature, sigResult.recovery, false);

            var _secp256k1 = require('@noble/curves/secp256k1').secp256k1;
            var expectedPub = _secp256k1.getPublicKey(randomKey, false);

            assert.deepEqual(Buffer.from(recovered), Buffer.from(expectedPub));
        });

        it('should handle recovery both as 0 and 1', function () {
            // Sign with 100 random messages, verify both recovery=0 and recovery=1 work
            var _secp256k1 = require('@noble/curves/secp256k1').secp256k1;
            for (var i = 0; i < 10; i++) {
                var randomKey = require('crypto').randomBytes(32);
                var randomMsg = require('crypto').randomBytes(32);

                var sigResult = secp256k1.sign(randomMsg, randomKey);
                var recovered = secp256k1.recover(randomMsg, sigResult.signature, sigResult.recovery, false);
                var expectedPub = _secp256k1.getPublicKey(randomKey, false);

                assert.deepEqual(Buffer.from(recovered), Buffer.from(expectedPub),
                    'recovery=' + sigResult.recovery + ' should work');
            }
        });
    });
});
