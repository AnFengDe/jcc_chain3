var elliptic = require('elliptic');
var Buffer = require('safe-buffer').Buffer;

var ec = new elliptic.ec('secp256k1');

/**
 * ECDSA sign (compatible with secp256k1 native module API)
 * @param {Buffer} msgHash - 32-byte message hash
 * @param {Buffer} privateKey - 32-byte private key
 * @returns {{signature: Buffer, recovery: number}}
 */
function sign(msgHash, privateKey) {
  var key = ec.keyFromPrivate(privateKey);
  var sig = key.sign(msgHash, { canonical: true });
  var r = sig.r.toArrayLike(Buffer, 'be', 32);
  var s = sig.s.toArrayLike(Buffer, 'be', 32);
  return {
    signature: Buffer.concat([r, s], 64),
    recovery: sig.recoveryParam
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
  var r = signature.slice(0, 32);
  var s = signature.slice(32, 64);
  var point = ec.recoverPubKey(msgHash, { r: r, s: s }, recovery);
  return Buffer.from(point.encode('hex', compressed), 'hex');
}

/**
 * Convert between compressed and uncompressed public key
 * @param {Buffer} pubKey - public key (compressed or uncompressed)
 * @param {boolean} compressed - whether to output compressed format
 * @returns {Buffer} converted public key
 */
function publicKeyConvert(pubKey, compressed) {
  var key = ec.keyFromPublic(pubKey);
  // getPublic(compressed, 'hex') → either 04xxx (uncompressed) or 02xxx/03xxx (compressed)
  return Buffer.from(key.getPublic(compressed, 'hex'), 'hex');
}

module.exports = {
  sign: sign,
  recover: recover,
  publicKeyConvert: publicKeyConvert
};
