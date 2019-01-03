'use strict';

//this port communicate with background
var port = chrome.runtime.connect({ name: "popup" });
port.postMessage({ src: "popup", dst: "background" });
port.onMessage.addListener(function (msg) {
    console.log("msg listened in popup: " + JSON.stringify(msg));
    if (!!msg.unapprovedTxs) {
        processTx(msg.unapprovedTxs);
        // var length = msg.unapprovedTxs.length
        // if(msg.unapprovedTxs.length > 0) {
        //     var tx = msg.unapprovedTxs[length - 1].data
        //     processTx(tx);
        // }else{
        //     console.log("no more unapprovedTxs")
        // }

    }
});

//just for debug, listen to port disconnect event
port.onDisconnect.addListener(function (message) {
    console.log("Port disconnected: " + JSON.stringify(message))
});

//post message to background
function messageToBackground(name, msg) {
    var data = {}
    data[name] = msg
    console.log('msg to background', msg)
    console.log('txTobeProcessed', txTobeProcessed)
    port.postMessage({
        src: "popup", dst: "background",
        serialNumber: txTobeProcessed.serialNumber || "",
        data: data
        // data: {
        //     name : msg
        // }
    });
}

var txTobeProcessed = ""
//var serialNumber

function processTx(unapprovedTxs) {
    var length = unapprovedTxs.length;
    if (length > 0) {
        var tx = unapprovedTxs[length - 1].data;
        txTobeProcessed = tx;
        console.log("to address: " + tx.to + ", mount: " + tx.value);
        
        if(typeof(window) !== 'undefined' && window.hxAppState) {
            var hxAppState = window.hxAppState;
            hxAppState.pushFlashTx(tx);
            return;
        }

        var precision = tx.precision || 5; // FIXME: get precision from network
        var currencySymbol = tx.currency;

        if (tx.serialNumber) {           //value send by hxPay is using unit of Wei
            let bgValue = new BigNumber(tx.value).div(Math.pow(10, precision));
        }

        //serialNumber = tx.serialNumber || "";
    } else {
        console.log("no more unapprovedTxs");

    }

}

//load stored keyfle info from chrome.storage.local
document.addEventListener("DOMContentLoaded", function () {
    console.log("popout page loaded...")
    // changeNetwork()
    restoreAccount()
    // $("#contract_div").css("display", "none");
});

var AccAddress;

function getNextTx() {
    console.log("to get next unapprovedTxs")

    messageToBackground("getNextTx", "true")

}

//tell background to check if the network is changed
function changeNetwork() {
    var url = localSave.getItem("apiPrefix")
    //var chainId = localSave.getItem("chainId")
    console.log("to change network")

    messageToBackground("changeNetwork", url)
}


function restoreAccount() {

    // chrome.storage.local.get(['keyInfo'], function (result) {
    //     console.log('keyInfo Value is :' + JSON.stringify(result.keyInfo));
    //     // TODO: result.keyInfo is json object
    //     if (result.keyInfo && result.keyInfo !== 'undefined' && result.keyInfo !== 'null' && !result.keyInfo.address) {
    //         result = JSON.parse(result.keyInfo)
    //     } else {
    //         result = undefined;
    //     }

    //     if (!!result) {
    //         $(".container select-wallet-file").addClass("active1")

    //         console.log("unlockFile:")
    //         UnlockFile(result.fileJson, result.password)
    //         if (typeof (hideKeyFileInput) === "function") hideKeyFileInput()
    //         getNextTx()
    //     }

    // });
    // TODO
    getNextTx();
}

function UnlockFile(fileJson, password) {
    console.log("\tfileJson: " + JSON.stringify(fileJson))

    try {
        var address;
        var Account = account_utils;
        var account = new Account();
        account.address = fileJson.address;

        account.fromKey(fileJson, password);
        address = account.getAddressString();
        gAccount = account;
        currentPrivateKey = PrivateKey.fromBuffer(account.getPrivateKey())
        currentPubKey = currentPrivateKey.toPublicKey();
        currentFromAddress = currentPubKey.toAddressString();

        AccAddress = address;

        console.log("AccAddress got...")
        port.postMessage({
            src: "popup",
            dst: "background",
            data: {
                AccAddress: AccAddress
            }
        });

        console.log("\tfileJson: " + JSON.stringify(gAccount));

        console.log("unlocked address: ", address);

        // load assets and balances
        apisInstance
            .init_promise.then(function () {

                TransactionHelper.listAssets(apisInstance, "", 100)
                    .then(r => {
                        console.log("assets: ", r);
                        let assets = r.sort(function (a, b) {
                            if (a.id === b.id) {
                                return 0;
                            } else if (a.id < b.id) {
                                return -1;
                            } else {
                                return 1;
                            }
                        });
                        chainAssets = assets;
                        let $assetsSelect = $("#transfer-asset-select");
                        $assetsSelect.html('');
                        let assetPrecisionMapping = {};
                        for (let asset of assets) {
                            let $option = $("<option></option>");
                            $option.text(asset.symbol);
                            $option.val(asset.id);
                            assetPrecisionMapping[asset.id] = parseInt(asset.precision);
                            $assetsSelect.append($option);
                        };
                        selectedAssetIdToTransfer = '1.3.0';

                        apisInstance
                            .db_api()
                            .exec("get_addr_balances", [address])
                            .then(r => {
                                console.log("balances: ", r);
                                let $balancesSelect = $("#balance");
                                let coreCoinBalances = r.sort(function (a, b) {
                                    if (a.id === b.id) {
                                        return 0;
                                    } else if (a.id < b.id) {
                                        return -1;
                                    } else {
                                        return 1;
                                    }
                                });
                                $balancesSelect.html('');
                                if (coreCoinBalances.length < 1) {
                                    let $option = $("<option></option>");
                                    $option.val('1.3.0');
                                    $option.text('0');
                                    $balancesSelect.append($option);
                                } else {
                                    for (let balance of coreCoinBalances) {
                                        let balanceAmount = new BigNumber(balance.amount);
                                        let $option = $("<option></option>");
                                        $option.val(balance.asset_id);
                                        let precision = assetPrecisionMapping[balance.asset_id];
                                        $option.text(balanceAmount.div(Math.pow(10, precision)).toFixed(precision));
                                        $balancesSelect.append($option);
                                    }
                                }
                            });
                    });
            }).catch(function (e) {
                bootbox.dialog({
                    backdrop: true,
                    onEscape: true,
                    message: i18n.apiErrorToText(e.message),
                    size: "large",
                    title: "Error"
                });
            });
    } catch (e) {
        // this catches e thrown by hx.js!account
        console.log("unlockFile error:" + JSON.stringify(e))

    }
}









