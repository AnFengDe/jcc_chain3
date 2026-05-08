var secp256k1 = require('@noble/curves/secp256k1').secp256k1;
var Buffer = require('safe-buffer').Buffer;

/**
 * ECDSA sign (compatible with secp256k1 native module API)
 * @param {Buffer} msgHash - 32-byte message hash
 * @param {Buffer} privateKey - 32-byte private key
 * @returns {{signature: Buffer, recovery: number}}
 */
function sign(msgHash, privateKey) {
  var sig = secp256k1.sign(msgHash, privateKey, { lowS: true });
  return {
    signature: Buffer.from(sig.toCompactRawBytes()),
    recovery: sig.recovery
  };
}

/**
 * ECDSA public key recovery (compatible with secp256k1 native module API)
 * @param {Buffer} msgHash - 32-byte message hash
 * @param {Buffer} signature - 64-byte signature (r || s)
 * @param {number} recovery - recovery parameter (0 or 1)
 * @param {boolean} [compressed=true] - whether to return compressed public key
 * @returns {Buffer} public key
 */
function recover(msgHash, signature, recovery, compressed) {
  if (compressed === undefined) {
    compressed = true;
  }
  var sig = secp256k1.Signature.fromCompact(signature);
  var point = sig.addRecoveryBit(recovery).recoverPublicKey(msgHash);
  return Buffer.from(point.toRawBytes(compressed));
}

/**
 * Convert between compressed and uncompressed public key
 * @param {Buffer} pubKey - public key (compressed or uncompressed)
 * @param {boolean} compressed - whether to output compressed format
 * @returns {Buffer} converted public key
 */
function publicKeyConvert(pubKey, compressed) {
  var point = secp256k1.ProjectivePoint.fromHex(Buffer.from(pubKey).toString('hex'));
  return Buffer.from(point.toRawBytes(compressed));
}

module.exports = {
  sign: sign,
  recover: recover,
  publicKeyConvert: publicKeyConvert
};
