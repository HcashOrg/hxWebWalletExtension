
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

const networkList = [
    {
        chainId: '2e13ba07b457f2e284dcfcbd3d4a3e4d78a6ed89a61006cdb7fdad6d67ef0b12', key: 'mainnet', name: "Mainnet",
        // url: "ws://211.159.168.197:6090"
        // url: "wss://nodeapi.hxlab.org:443"
        url: "ws://nodeapi.hxlab.org:6090"
    },
    { chainId: '9f3b24c962226c1cb775144e73ba7bb177f9ed0b72fac69cd38764093ab530bd', key: 'testnet', name: "Testnet", url: "ws://47.74.44.110:8090" },
    {
        //  chainId: 'fe70279c1d9850d4ddb6ca1f00c577bc2e86bf33d54fafd4c606a6937b89ae32', // local testnet
        chainId: '2e13ba07b457f2e284dcfcbd3d4a3e4d78a6ed89a61006cdb7fdad6d67ef0b12', // local mainnet
        key: 'localhost', name: "localhost:8090", url: "ws://localhost:8090"
    },
    {
        chainId: '2e13ba07b457f2e284dcfcbd3d4a3e4d78a6ed89a61006cdb7fdad6d67ef0b12', key: 'indicator', name: "Indicator",
        url: "ws://localhost:50320"
    },
    {
        chainId: '2c5729a8f02e0431233528a3db625a7b0f83aa7c9f561d9bd73886d993a57161', key: 'regtest', name: "Regtest",
        url: "ws://localhost:60320",
        address_prefix: "HXT",
    },
    {
        chainId: '2c5729a8f02e0431233528a3db625a7b0f83aa7c9f561d9bd73886d993a57161', key: 'regtest121', name: "Regtest121",
        url: "ws://192.168.1.121:30000",
        address_prefix: "HXT",
    },
    {
        chainId: '2c5729a8f02e0431233528a3db625a7b0f83aa7c9f561d9bd73886d993a57161', key: 'regtest121b', name: "Regtest121",
        url: "ws://192.168.1.121:30002",
        address_prefix: "HXT",
    },
    {
        chainId: '22f71d13b03b4e83918957fddb4d1441513e830a885936def665fddc77a85ee8', key: 'testnet2',
        name: 'Testnet2', url: "ws://192.168.1.121:60038",
    },
    {
        chainId: '08d1d10092bbdbb68c1613c93ded434805381fe73e845c59b5a97693fa1a778e', key: 'dexTestnet', name: 'DexTestnet', url: 'ws://192.168.1.122:10055',
    },
    {
        chainId: '08d1d10092bbdbb68c1613c93ded434805381fe73e845c59b5a97693fa1a778e', key: 'hdaoTestnet', name: 'HdaoTestnet', url: 'ws://114.67.86.57:60038',
    },
];

function getNetworkConfig() {
    network = localSave.getItem("apiPrefix") || 'ws://nodeapi.hxlab.org:6090'; // 'ws://211.159.168.197:6090';
    chainId = localSave.getItem("chainId") || '2e13ba07b457f2e284dcfcbd3d4a3e4d78a6ed89a61006cdb7fdad6d67ef0b12';
    return { network: network, chainId: chainId };
}


mergeNetworkListWithLocalNetwork();

function setStorage(key, value) {
    if (typeof localStorage !== "undefined") {
        try {
            return localStorage.setItem(key, value);
        } catch (e) {

        }
    }
}

function getStorage(key) {
    if (typeof localStorage !== "undefined") {
        try {
            return localStorage.getItem(key);
        } catch (e) {

        }
    }
}

function setLocalNetwork(url, chainId) {
    setStorage("local_network", JSON.stringify({
        chainId: chainId,
        key: 'local',
        name: 'Local',
        url: url
    }));
}

function getLocalNetwork() {
    const info = getStorage("local_network");
    if (!info) {
        return null;
    }
    try {
        return JSON.parse(info);
    } catch (e) {
        return null;
    }
}

function mergeNetworkListWithLocalNetwork() {
    const network = getLocalNetwork();
    if (!network) {
        return networkList;
    }
    let found = false;
    for (let item of networkList) {
        if (item.key === network.key && item.url !== network.url) {
            item.url = network.url;
            item.chainId = network.chainId;
            item.name = network.name;
            found = true;
            break;
        }
    }
    if (!found) {
        networkList.push(network);
    }
    return networkList;
}

function resetHxNetwork() {
    let config = getNetworkConfig();
    network = config.network;
    chainId = config.chainId;

    try {
        Apis.setAutoReconnect(true);
        apiInstance = Apis.instance(network, true);
    } catch (e) {
        console.log("instance apis network error", e);
    }
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
        case 'lockBalanceToCitizen': {
            cb(null);
        } break;
        case 'sign_raw': {
            cb(null);
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
                const config = getNetworkConfig();
                const testnetChainId = "2c5729a8f02e0431233528a3db625a7b0f83aa7c9f561d9bd73886d993a57161";
                const addrPrefix = config.chainId === testnetChainId ? 'HXT' : 'HX';
                let curAddr = AccAddress;
                if (curAddr.substr(0, 3) !== 'HXT' && addrPrefix === 'HXT') {
                    curAddr = addrPrefix + curAddr.substr(2);
                }
                port.postMessage({
                    source: sourceName,
                    account: curAddr,
                    accountPubKey: AccPubKey.toPublicKeyString(addrPrefix),
                    accountPubKeyString: AccPubKeyString
                })
            }
            else if (msg.data.method === 'getConfig') {
                const config = getNetworkConfig();
                port.postMessage({
                    source: sourceName,
                    config: config,
                })
            }
            else if (msg.data.method === 'setConfig') {
                // 修改当前钱包的网络配置
                const targetChainId = msg.data.data.chainId;
                const targetNetworkKey = msg.data.data.networkKey;
                const targetNetwork = msg.data.data.network;
                const targetClientNetwork = msg.data.data.clientNetwork;
                console.log(msg.data);
                let networkObj = null;
                for (const item of networkList) {
                    if (item.key === targetNetworkKey) {
                        networkObj = item;
                        break;
                    }
                }
                if (networkObj) {
                    const chainRpcUrl = networkObj.url;
                    localSave.setItem("networkKey", networkObj.key);
                    localSave.setItem("apiPrefix", chainRpcUrl);
                    localSave.setItem("chainId", networkObj.chainId);
                }

                port.postMessage({
                    source: sourceName,
                    setConfigCallback: true,
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
                });
                unapprovedTxs.pop();
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
                    forwardMsgToPage(msg.serialNumber, msg.data.txhash, null, 'txhash');
                    return
                }
                chrome.tabs.query({}, function (tabs) {       //send tx receipt back to web page
                    for (var i = 0; i < tabs.length; ++i) {
                        chrome.tabs.sendMessage(tabs[i].id, { txhash: msg.data.txhash });
                    }
                });

            }
            else if (!!msg.data.sig) {
                console.log("sig: " + msg.data.sig);
                if (msg.serialNumber) {
                    forwardMsgToPage(msg.serialNumber, msg.data.sig, null, 'sig');
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
                    forwardMsgToPage(msg.serialNumber, msg.data.default, msg.data.name);
                }
            }

        }
    });
});

//forward msg from popup-page to Dapp-page(Page ID has been recorded)
function forwardMsgToPage(serialNumber, resp, err, name) {
    var senderInfo = messagesFromPage[serialNumber];
    if (senderInfo) {
        chrome.tabs.sendMessage(senderInfo.sender.id,
            {
                "src": "background",
                "logo": "hx",
                "serialNumber": serialNumber,
                "resp": resp,
                "error": err,
                "name": name
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
    // if (unapprovedTxs.length === 0)
    //     chrome.browserAction.setBadgeText({ text: '' });
    // else
    //     chrome.browserAction.setBadgeText({ text: unapprovedTxs.length.toString() });
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
        var account = account_utils.NewAccount();
        account.fromKey(keyJson, password);
        var address = account.getAddressString("HX");
        account.address = address;
        gAccount = account;
        AccAddress = address;
        var pkey = PrivateKey.fromBuffer(account.getPrivateKey());
        AccPubKey = pkey.toPublicKey();
        AccPubKeyString = AccPubKey.toPublicKeyString();

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

            if (request.params.pay) {
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
                        forwardMsgToPage(request.params.serialNumber, resp, err);
                        sendResponse({
                            "src": "background",
                            "logo": "hx",
                            "serialNumber": request.params.serialNumber,
                            "resp": resp,
                            "error": err,
                        });
                    });
                } else if (type === "lockBalanceToCitizen") {
                    var toCitizenIdOrName = request.params.pay.payload.citizen;
                    var assetId = request.params.pay.payload.assetId;
                    var amount = request.params.pay.payload.amount;
                    cacheTx({ data: txData }, 'locktocitizen=' + (toCitizenIdOrName || ''));

                    rpc_call(txData, 'lockBalanceToCitizen', function (resp, err) {
                        forwardMsgToPage(request.params.serialNumber, resp, err);
                        sendResponse({
                            "src": "background",
                            "logo": "hx",
                            "serialNumber": request.params.serialNumber,
                            "resp": resp,
                            "error": err,
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
            } else if (request.params.isSignBufferText && request.params.signBufferText) {
                const signBufferText = request.params.signBufferText;
                const rawData = {
                    "rawData": signBufferText,
                    "serialNumber": request.params.serialNumber,
                    "callback": request.params.callback,
                };
                cacheTx({ data: rawData }, 'sign_raw');
                rpc_call(rawData, 'sign_raw', function (resp, err) {
                    forwardMsgToPage(request.params.serialNumber, resp, err);
                    sendResponse({
                        "src": "background",
                        "logo": "hx",
                        "serialNumber": request.params.serialNumber,
                        "resp": resp,
                        "error": err
                    });
                });
            }
        }

    });

//details.reason === 'install' || details.reason === 'update'
chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason === 'install' || details.reason === 'update') {
        // chrome.tabs.create({url: 'html/welcome.html'}) // TODO
    }
})
