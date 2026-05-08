/*
 * Example program to compile a demo contract
 * and deploy on the tesnet
 * Usage:
 * node contract_deploy.js test.sol
*/
var fs = require('fs');
var solc = require('solc');
var Chain3 = require('../index.js'); 

var cmds = process.argv;
if(cmds != null && cmds.length == 3){
  var file = cmds[2];
}else
{
  console.log("Input should have contract file and contract name:\neg: node deploy.js test.sol");
  return;
}
  var content = fs.readFileSync(file).toString();

  var input = {
    file: content
  };

// IMPORTANT: Replace with your own account before running.
// This is a publicly-known testnet account — NOT a production secret.
// The key below is published in the source for development convenience only.
var tacct = {
  "addr": "<YOUR_MOAC_TESTNET_ADDRESS>",
  "key": "<YOUR_MOAC_TESTNET_PRIVATE_KEY>"
};

  var output = solc.compile({sources: input}, 1);
  console.log("outputs:", output);
  console.log('contracts', Object.keys(output.contracts));

  var key = Object.keys(output.contracts);
  //this is the 
  console.log("key:", key);
  var ctt = output.contracts[key];

  if(ctt == null){
      console.log("Contract CTT is empty1");
      return;
  }

  var bytecode = "0x"+ctt.bytecode;
  var abi = JSON.parse(ctt.interface);

  //Display info abouit the contract


  var chain3 = new Chain3();
  chain3.setProvider(new chain3.providers.HttpProvider('http://localhost:8545'));
  let gasEstimate = chain3.mc.estimateGas({data: bytecode});

  //Build the raw transaction
  createContract(tacct,gasEstimate,bytecode);


/*
 * Create a contract by using the input info
 * and build a valid transaction
 * Get the account TX count to set the raw TX command nonce value
 * Requires the private key
 * Sign the transaction
*/
function createContract(src, gasValue, inByteCode){

    var txcount = chain3.mc.getTransactionCount(src["addr"]);
    console.log("Get tx account", txcount)

    //Build the raw tx obj
    //note the transaction
    var rawTx = {
      from: src.addr,
      nonce: chain3.intToHex(txcount),
      gasPrice: chain3.intToHex(420000000000),//chain3.intToHex(chain3.mc.gasPrice)
      gasLimit: chain3.intToHex(gasValue),
      to: '0x',
      value: '0x', 
      data: inByteCode,
      shardingFlag: 0, //default is global contract
      chainId: chain3.version.network
    }

    console.log(rawTx);


    var cmd1 = chain3.signTransaction(rawTx, src["key"]);    

console.log("SignedTx:", cmd1);
return;
    chain3.mc.sendRawTransaction(cmd1, function(err, hash) {
        if (!err){
            
            console.log("Succeed!: ", hash);
            return hash;
        }else{
            console.log("Chain3 error:", err.message);
            return err.message;
        }
    
    // console.log(response);
    console.log("Get response from MOAC node in the feedback function!")
    });

}

return;

