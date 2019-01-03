
'use strict';

console.log('background.js start')

var msgCount = 0;
//var unapprovedTxCount = 0;
var unapprovedTxs = [];

var AccAddress;
var AccPubKey;
var AccPubKeyString;

var gAccount;
var network, chainId;

var sourceName = 'HxExtWallet';

let {
    PrivateKey,
    Address,
    key,
    TransactionBuilder,
    TransactionHelper,
} = hx_js;
let { Apis, ChainConfig } = hx_js.bitshares_ws;


var apiInstance;

function resetHxNetwork() {
    network = localSave.getItem("apiPrefix") || 'ws://localhost:8090';
    chainId = localSave.getItem("chainId");

    apiInstance = Apis.instance(network, true);
}


function rpc_call(data, type, cb) {
    if (!gAccount) {
        cb("error, please import wallet file");
        return;
    }
    const pkey = PrivateKey.fromBuffer(gAccount.getPrivateKey());
    const pubKey = pkey.toPublicKey();
    switch (type) {
        case 'transfer': {
            cb(null); // TODO
        } break;
        case 'transfer_to_contract': {
            var contractId = data.to;
            var value = data.value || '0';
            var assetSymbol = data.currency || '1.3.0';
            var transferMemo = data.transferMemo;
            TransactionHelper.transferToContractTesting(
                apiInstance,
                pubKey,
                contractId,
                value,
                assetSymbol,
                transferMemo
            )
                .then(data => {
                    cb(data);
                })
                .catch(err => {
                    console.log("rpc call error: " + JSON.stringify(err));
                    cb(null, err.message || err)
                });
        } break;
        default: {
            // 'invoke_contract' or default
            var contractId = data.to;
            var contractApi = data.contractApi
            var apiArg = data.contractArg
            TransactionHelper.invokeContractOffline(
                apiInstance,
                pubKey,
                contractId,
                contractApi,
                apiArg
            )
                .then(data => {
                    cb(data);
                })
                .catch(err => {
                    console.log("rpc call error: " + JSON.stringify(err));
                    cb(null, err.message || err)
                });
        }
    }

}

//receive msg from ContentScript and popup.js
chrome.runtime.onConnect.addListener(function (port) {
    console.log("Connected ....." + port.name);

    port.onMessage.addListener(function (msg) {

        msgCount++;
        console.log("msgCount:" + msgCount);
        console.log("msg listened: " + JSON.stringify(msg));

        if (msg.src === 'contentScript') {       //message from webpage(DApp page)
            if (!msg.data)
                return;
            // TODO
            if (msg.data.method === "hx_sendTransaction") {
                cacheTx(msg.data);
            }
            else if (msg.data.method === "hx_call") {
                rpc_call(msg.data.data, '', function (resp) {
                    port.postMessage({
                        source: sourceName,
                        hx_call: resp
                    })
                })
            }
            else if (msg.data.method === "getUserAddress") {
                port.postMessage({
                    source: sourceName,
                    account: AccAddress,
                    accountPubKey: AccPubKey,
                    accountPubKeyString: AccPubKeyString
                })
            }
            else if (msg.data.method === 'getConfig') {
                port.postMessage({
                    source: sourceName,
                    config: {
                        network: network,
                        chainId: chainId,
                    },
                })
            }
        }
        //**********************************
        else if (msg.src === 'popup') {      //message from extension popup page
            console.log(msg);
            if (!msg.data)
                return;
            if (!!msg.data.AccAddress) {
                AccAddress = msg.data.AccAddress;
                AccPubKey = msg.data.AccPubKey;
                AccPubKeyString = msg.data.AccPubKeyString;
            }
            else if (!!msg.data.changeNetwork) {
                if (msg.data.changeNetwork !== network) {
                    resetHxNetwork();
                }
            }
            else if (!!msg.data.newWallet) {     //user changed wallet, update the wallet right now
                restoreAccount();
            }
            else if (!!msg.data.getNextTx) {
                port.postMessage({
                    source: sourceName,
                    unapprovedTxs: unapprovedTxs
                })
            }
            else if (!!msg.data.rejectAll) {
                unapprovedTxs.splice(0, unapprovedTxs.length);
                updateBadgeText();
            }
            else if (!!msg.data.generate || !!msg.data.reject) {
                unapprovedTxs.pop();
                updateBadgeText();
            }
            else if (!!msg.data.txhash) {
                console.log("txhash: " + JSON.stringify(msg.data.txhash));
                //if has serial number, then this message is send from hxpay,
                if (msg.serialNumber) {
                    forwardMsgToPage(msg.serialNumber, msg.data.txhash);
                    return
                }
                chrome.tabs.query({}, function (tabs) {       //send tx receipt back to web page
                    for (var i = 0; i < tabs.length; ++i) {
                        chrome.tabs.sendMessage(tabs[i].id, { txhash: msg.data.txhash });
                    }
                });

            }
            else if (!!msg.data.receipt) {
                console.log("Receipt: " + JSON.stringify(msg.data.Receipt));
                chrome.tabs.query({}, function (tabs) {       //send tx receipt back to web page
                    for (var i = 0; i < tabs.length; ++i) {
                        chrome.tabs.sendMessage(tabs[i].id, { receipt: msg.data.Receipt });
                    }
                });

            }
            else if (!!msg.data.default) { //some message about this serial-number
                console.log("txhash: " + JSON.stringify(msg.data.default));
                if (msg.serialNumber) {
                    forwardMsgToPage(msg.serialNumber, msg.data.default);
                }
            }

        }
    });
});

//forward msg from popup-page to Dapp-page(Page ID has been recorded)
function forwardMsgToPage(serialNumber, resp, err) {
    var senderInfo = messagesFromPage[serialNumber];
    if (senderInfo) {
        chrome.tabs.sendMessage(senderInfo.sender.id,
            {
                "src": "background",
                "logo": "hx",
                "serialNumber": serialNumber,
                "resp": resp,
                "error": err
            });

        //delete messagesFromPage[serialNumber];
    }

}
//received a sendTransaction message
function cacheTx(txData, pageType) {
    unapprovedTxs.push(txData)
    console.log("unapprovedTxCount:" + unapprovedTxs.length);
    updateBadgeText();
    var urlHash = 'transfer';
    if (pageType) {
        urlHash = pageType;
    }
    chrome.windows.create({ 'url': 'hxWebWallet/ext_index.html#' + urlHash, 'type': 'popup', height: 1024, width: 500 }, function (window) {
    });
}

function updateBadgeText() {
    if (unapprovedTxs.length === 0)
        chrome.browserAction.setBadgeText({ text: '' });
    else
        chrome.browserAction.setBadgeText({ text: unapprovedTxs.length.toString() });
}

//initiallize: updateBadgeText()
document.addEventListener("DOMContentLoaded", function () {
    console.log("background page loaded...")
    updateBadgeText()
    resetHxNetwork()
    restoreAccount()
});

function restoreAccount() {
    try {
        if (!localStorage.keyInfo) {
            return;
        }
        var keyPassword = localStorage.keyPassword;
        var keyInfo = JSON.parse(localStorage.keyInfo);
        console.log("unlockFile:");
        UnlockFile(keyInfo, keyPassword);
    } catch (e) {
        console.log('restore account error', e);
    }
    // chrome.storage.local.get(['keyInfo', 'keyPassword'], function (result) {
    //     if (!result || !result.keyInfo || !result.keyPassword) {
    //         return;
    //     }
    //     console.log("unlockFile:");
    //     UnlockFile(result.keyInfo, result.keyPassword);
    // });
}

function UnlockFile(keyJson, password) {
    console.log("\tkeyJson: " + JSON.stringify(keyJson))

    try {
        var address;
        let account = account_utils.NewAccount();
        account.fromKey(keyJson, password);
        var address = account.getAddressString("HX");
        account.address = address;
        gAccount = account;
        AccAddress = address;
        AccPubKey = account.getPublicKey();
        AccPubKeyString = account.getPublicKeyString();

    } catch (e) {
        // this catches e thrown by hx.js!account
        console.log("unlockFile error:" + JSON.stringify(e))

    }
}

//use Object messagesFromPage as map,
// used to save the message from hxpay, key= serialNumber, value=
var messagesFromPage = {};

//listen msg from contentscript (hxpay -> contentscript -> background)
chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        console.log(sender.tab ?
            "from a content script:" + JSON.stringify(sender.tab) :
            "from the extension");

        console.log("request: " + JSON.stringify(request));

        if (request.logo === "hx") {
            messagesFromPage[request.params.serialNumber] = { sender: sender.tab, params: request.params };

            var type = request.params.pay.payload.type;
            var txData = {
                "currency": request.params.pay.currency,
                "to": request.params.pay.to,
                "value": request.params.pay.value,
                "valueRaw": request.params.pay.valueRaw,
                "contractApi": request.params.pay.contractApi,
                "contractArg": request.params.pay.contractArg,
                "memo": request.params.pay.memo,
                "gasPrice": request.params.pay.gasPrice,
                "gasLimit": request.params.pay.gasLimit,
                "serialNumber": request.params.serialNumber,
                "callback": request.params.callback
            };
            if (type === "simulateCall") {       //
                cacheTx({ data: txData }, 'invoke_contract');

                rpc_call(txData, 'invoke_contract', function (resp, err) {
                    forwardMsgToPage(request.params.serialNumber, resp, err)
                    sendResponse({
                        "src": "background",
                        "logo": "hx",
                        "serialNumber": request.params.serialNumber,
                        "resp": resp,
                        "error": err
                    });
                });
            } else if (type === "invokeContract") {
                cacheTx({ data: txData }, 'invoke_contract');

                rpc_call(txData, 'invoke_contract', function (resp, err) {
                    forwardMsgToPage(request.params.serialNumber, resp, err);
                    sendResponse({
                        "src": "background",
                        "logo": "hx",
                        "serialNumber": request.params.serialNumber,
                        "resp": resp,
                        "error": err
                    });
                });
            } else if (type === "transferToContract") {
                cacheTx({ data: txData }, 'transfer_to_contract');
                rpc_call(txData, 'transfer_to_contract', function (resp, err) {
                    forwardMsgToPage(request.params.serialNumber, resp, err);
                    sendResponse({
                        "src": "background",
                        "logo": "hx",
                        "serialNumber": request.params.serialNumber,
                        "resp": resp,
                        "error": err
                    });
                });
            } else if (type === "transfer") {
                cacheTx({ data: txData }, 'transfer');
                rpc_call(txData, 'transfer', function (resp, err) {
                    forwardMsgToPage(request.params.serialNumber, resp, err);
                    sendResponse({
                        "src": "background",
                        "logo": "hx",
                        "serialNumber": request.params.serialNumber,
                        "resp": resp,
                        "error": err
                    });
                });
            } else if (type === "binary") {
                cacheTx({ data: txData });
            } else {
                sendResponse({
                    "serialNumber": request.params.serialNumber, "resp": "undefined interface"
                })
            }
        }

    });

//details.reason === 'install' || details.reason === 'update'
chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason === 'install' || details.reason === 'update') {
        // chrome.tabs.create({url: 'html/welcome.html'}) // TODO
    }
})
