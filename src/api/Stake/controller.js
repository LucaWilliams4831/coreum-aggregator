require('dotenv').config('../.env');

const {
    Client,
    AccountId,
    PrivateKey,
    TransferTransaction,
    Hbar,
    NftId,
    TokenId,
    TransactionId,
    AccountAllowanceApproveTransaction
} = require('@hashgraph/sdk');

const axios = require('axios');

const { StakedNfts, AdminInfo, RewardInfo } = require('../../db');

// Get operator from .env file
const networkType = process.env.NETWORK_TYPE;

const operatorId = AccountId.fromString(process.env.TREASURY_ID);
const operatorKey = PrivateKey.fromString(process.env.TREASURY_PVKEY);
const client = networkType === "mainnet" ?
    Client.forMainnet().setOperator(operatorId, operatorKey) :
    Client.forTestnet().setOperator(operatorId, operatorKey);

const NFT_STAKE_FEE = 1;
const HBAR_DECIMAL = 100000000;
const MIN_BALANCE_TO_REMAIN = 5;

const PIZZA_NFT_ID = "0.0.943525";
const ULTRA_SLICE_ID = "0.0.1353507";

//======================================================================================================
// staking

exports.stakeNewNfts = async (req_, res_) => {
    console.log("stakeNewNfts log - 1 : ", req_.body);

    const _accountId = req_.body.accountId;
    const _nftInfo = req_.body.nftInfo;

    if (!_accountId || !_nftInfo)
        return res_.send({ result: false, error: "Invalid post data!" });

    const _response = await axios.get(`https://mainnet-public.mirrornode.hedera.com/api/v1/accounts/${_accountId}/allowances/crypto`);
    // console.log("stakeNewNfts log - 2 : ", _response.data.allowances);
    let _allowanceCheck = false;
    if (_response && _response.data.allowances && _response.data.allowances?.length > 0) {
        const _allowanceInfo = _response.data.allowances;
        // console.log("stakeNewNfts log - 3 : ", _allowanceInfo);
        for (let i = 0; i < _allowanceInfo.length; i++) {
            // console.log("stakeNewNfts log - 4 : ", operatorId.toString());
            if (_allowanceInfo[i].spender === operatorId.toString() && _allowanceInfo[i].amount_granted >= NFT_STAKE_FEE * HBAR_DECIMAL) {
                _allowanceCheck = true;
                break;
            }
        }
    }
    if (!_allowanceCheck)
        return res_.send({ result: false, error: "Something wrong with - allowance" });

    const sendBal = new Hbar(NFT_STAKE_FEE); // Spender must generate the TX ID or be the client

    const nftSendTx = new TransferTransaction()
        .addApprovedHbarTransfer(AccountId.fromString(_accountId), sendBal.negated())
        .addHbarTransfer(operatorId, sendBal);
    for (let i = 0; i < _nftInfo.length; i++) {
        const _nft = new NftId(TokenId.fromString(_nftInfo[i].tokenId), _nftInfo[i].serialNum);
        nftSendTx.addApprovedNftTransfer(_nft, AccountId.fromString(_accountId), operatorId);
    }
    nftSendTx.setTransactionId(TransactionId.generate(operatorId)).freezeWith(client);
    const nftSendSign = await nftSendTx.sign(operatorKey);
    const nftSendSubmit = await nftSendSign.execute(client);
    const nftSendRx = await nftSendSubmit.getReceipt(client);
    if (nftSendRx.status._code != 22)
        return res_.send({ result: false, error: "Something wrong with - nft transfer" });

    for (let i = 0; i < _nftInfo.length; i++) {
        const _newStakedNft = new StakedNfts({
            accountId: _accountId,
            tokenId: _nftInfo[i].tokenId,
            serialNum: _nftInfo[i].serialNum
        });

        await StakedNfts.deleteMany({ accountId: _accountId, tokenId: _nftInfo[i].tokenId, serialNum: _nftInfo[i].serialNum });
        await _newStakedNft.save();
    }

    return res_.send({ result: true, data: "NFTs successfully staked." });
}

exports.loadStakedNfts = async (req_, res_) => {
    console.log("loadStakedNfts log - 1 : ", req_.query);

    const _accountId = req_.query.accountId;

    const _stakedNfts = await StakedNfts.find({ accountId: _accountId });
    if (!_stakedNfts)
        return res_.send({ result: false, error: "Something wrong with load staked NFTs." });

    let _stakedNftInfo = [];
    for (let i = 0; i < _stakedNfts.length; i++) {
        console.log("loadStakedNfts log - 2 : ", parseInt((Date.now() - _stakedNfts[i].createdAt) / 86400000));
        let _stakedDays = parseInt((Date.now() - _stakedNfts[i].createdAt) / 86400000);

        _stakedNftInfo.push({
            tokenId: _stakedNfts[i].tokenId,
            serialNum: _stakedNfts[i].serialNum,
            stakedDays: _stakedDays
        })
    }

    return res_.send({ result: true, data: _stakedNftInfo });
}

exports.unstakeNft = async (req_, res_) => {
    console.log("unstakeNft log - 1 : ", req_.body);

    const _accountId = req_.body.accountId;
    const _tokenId = req_.body.tokenId;
    const _serialNum = req_.body.serialNum;

    if (!_accountId || !_tokenId || !_serialNum)
        return res_.send({ result: false, error: "Invalid post data!" });

    const _findNft = await StakedNfts.find({ accountId: _accountId, tokenId: _tokenId, serialNum: _serialNum });
    if (!_findNft || _findNft.length === 0)
        return res_.send({ result: false, error: "Something wrong with load NFT." });

    const transaction = new AccountAllowanceApproveTransaction()
        .approveTokenNftAllowance(new NftId(TokenId.fromString(_tokenId), parseInt(_serialNum)), operatorId, AccountId.fromString(_accountId))
        .freezeWith(client);
    const signTx = await transaction.sign(operatorKey);
    const txResponse = await signTx.execute(client);
    const receipt = await txResponse.getReceipt(client);
    const transactionStatus = receipt.status;

    if (transactionStatus != 22)
        return res_.send({ result: false, error: "NFT approve failed!" });

    const _approveResult = await StakedNfts.updateOne({ accountId: _accountId, tokenId: _tokenId, serialNum: _serialNum }, { status: "approved" });
    if (!_approveResult)
        return res_.send({ result: false, error: "Something wrong with NFT approve! Please try again." });

    return res_.send({ result: true, data: "success" });
}

exports.refreshData = async (req_, res_) => {
    console.log("refreshData log - 1 : ", req_.body);

    const _accountId = req_.body.accountId;
    const _tokenId = req_.body.tokenId;
    const _serialNum = req_.body.serialNum;

    if (!_accountId || !_tokenId || !_serialNum)
        return res_.send({ result: false, error: "Invalid post data!" });

    const _nftTransactionHistory = await axios.get(`https://mainnet-public.mirrornode.hedera.com/api/v1/tokens/${_tokenId}/nfts/${_serialNum}/transactions/`);
    console.log("refreshData log - 2 : ", _nftTransactionHistory.data.transactions);

    if (!_nftTransactionHistory) {
        return res_.send({ result: false, error: "Something wrong with get NFT transaction info." });
    }

    if (_nftTransactionHistory.data.transactions[0].receiver_account_id === operatorId) {
        return res_.send({ result: false, error: "Something wrong with unstake NFT!" });
    }

    const _deleteResult = await StakedNfts.deleteMany({ accountId: _accountId, tokenId: _tokenId, serialNum: _serialNum, status: "approved" });
    if (!_deleteResult) {
        return res_.send({ result: false, error: "Something wrong with update!" });
    }

    return res_.send({ result: true, data: "success" });
}


//======================================================================================================
// admin

exports.depositToTreasury = async (req_, res_) => {
    console.log("depositToTreasury log - 1 : ", req_.body);

    const _accountId = req_.body.accountId;
    const _amount = req_.body.amount;

    if (!_accountId || !_amount)
        return res_.send({ result: false, error: "Invalid post data!" });

    // const _response = await axios.get(`https://mainnet-public.mirrornode.hedera.com/api/v1/accounts/${_accountId}/allowances/crypto`);
    // let _allowanceCheck = false;
    // if (_response?.data?.allowances) {
    //     const _allowanceData = _response.data.allowances;
    //     console.log("depositToTreasury log - 2 : ", _allowanceData[_allowanceData.length - 1]);
    //     console.log("depositToTreasury log - 3 : ", operatorId.toString());

    //     if (_allowanceData[_allowanceData.length - 1].spender === operatorId.toString()
    //         && _allowanceData[_allowanceData.length - 1].amount_granted >= _amount * 100000000)
    //         _allowanceCheck = true;
    // } else {
    //     return res_.send({ result: false, error: "Something wrong with allowance-1!" });
    // }

    // if (!_allowanceCheck)
    //     return res_.send({ result: false, error: "Something wrong with allowance-2!" });

    const sendBal = new Hbar(_amount);

    const approvedSendTx = new TransferTransaction()
        .addApprovedHbarTransfer(AccountId.fromString(_accountId), sendBal.negated())
        .addHbarTransfer(operatorId, sendBal)
        .setTransactionId(TransactionId.generate(operatorId)) // Spender must generate the TX ID or be the client
        .freezeWith(client);
    const approvedSendSign = await approvedSendTx.sign(operatorKey);
    const approvedSendSubmit = await approvedSendSign.execute(client);
    const approvedSendRx = await approvedSendSubmit.getReceipt(client);
    if (approvedSendRx.status._code != 22)
        return res_.send({ result: false, error: "Something wrong with - 3." });

    const _setValue = new AdminInfo({
        transactionType: "deposit",
        balance: _amount
    });

    const _insertResult = await _setValue.save();

    return res_.send({ result: true, data: _insertResult });
}

exports.distributeRequest = async (req_, res_) => {
    console.log("distributeRequest log - 1 : ", req_.body);
    const _accountId = req_.body.accountId;
    const _amount = req_.body.amount;

    if (!_accountId || !_amount)
        return res_.send({ result: false, error: "Invalid post data!" });

    const _treasuryBalance = getWalletBalance(operatorId.toString());
    if (_amount > _treasuryBalance - MIN_BALANCE_TO_REMAIN)
        return res_.send({ result: false, error: "Something wrong distribute amount." });

    const _stakedInfo = await StakedNfts.find({});
    if (!_stakedInfo)
        return res_.send({ result: false, error: "Something wrong with load staked info!" });

    const _stakedUltraInfo = await StakedNfts.find({ tokenId: ULTRA_SLICE_ID });
    if (!_stakedUltraInfo)
        return res_.send({ result: false, error: "Something wrong with load staked Ultra info!" });

    console.log("distributeRequest log - 2 : ", _stakedInfo);

    let _rewardInfo = [];
    const _rewardPerNft = _amount / (_stakedInfo.length + (_stakedUltraInfo.length * 9));

    for (let i = 0; i < _stakedInfo.length; i++) {
        const _accountFilter = { accountId: _stakedInfo[i].accountId };
        const _accountFilterResult = filterObject(_rewardInfo, _accountFilter);
        let _reward = _rewardPerNft;
        if (_stakedInfo[i].tokenId === ULTRA_SLICE_ID)
            _reward = _rewardPerNft * 10;

        if (_accountFilterResult.length === 0) {
            _rewardInfo.push({
                accountId: _stakedInfo[i].accountId,
                amount: _reward
            });
        } else {
            _accountFilterResult[0].amount += _reward;
        }
    }

    for (let i = 0; i < _rewardInfo.length; i++) {

        // const approvedSendTx = new AccountAllowanceApproveTransaction().approveHbarAllowance(operatorId, AccountId.fromString(_rewardInfo[i].accountId), _rewardInfo[i].amount)
        //     .freezeWith(client);
        // const approvedSendSign = await approvedSendTx.sign(operatorKey);
        // const approvedSendSubmit = await approvedSendSign.execute(client);
        // const approvedSendRx = await approvedSendSubmit.getReceipt(client);
        // if (approvedSendRx.status._code != 22)
        //     return res_.send({ result: false, error: "Something wrong with - 3." });

        const _setValue = new RewardInfo({
            accountId: _rewardInfo[i].accountId,
            amount: parseFloat(_rewardInfo[i].amount).toFixed(2),
            status: "pending"
        });

        await _setValue.save();
    }

    console.log("distributeRequest log - 3 : ", _rewardInfo);
    return res_.send({ result: true, data: "success" });
}

exports.stakedNftCount = async (req_, res_) => {
    const _totalNfts = await StakedNfts.find({});
    if (!_totalNfts)
        return res_.send({ result: false, error: "Something wrong with staked NFT count!" });
    return res_.send({ result: true, data: { stakedNftCount: _totalNfts.length } });
}

exports.getAvailableBalance = async (req_, res_) => {
    const _totalPendingInfo = await RewardInfo.find({ status: "pending" });
    if (!_totalPendingInfo)
        return res_.send({ result: false, error: "Something wrong with loading data!" });

    let _pendingBalance = 0;
    for (let i = 0; i < _totalPendingInfo.length; i++) {
        _pendingBalance += parseFloat(_totalPendingInfo[i].amount);
    }

    let _treasuryBalance = await getWalletBalance(operatorId.toString());
    let _availableBalance = _treasuryBalance - _pendingBalance * 100000000;

    return res_.send({ result: true, data: { amount: _availableBalance } });
}

exports.getReward = async (req_, res_) => {
    console.log("getReward log - 1 : ", req_.query);
    const _accountId = req_.query.accountId;

    const _rewardData = await RewardInfo.find({ $or: [{ accountId: _accountId, status: "pending" }, { accountId: _accountId, status: "approved" }] });
    if (!_rewardData)
        return res_.send({ result: false, error: "Something wrong with staked NFT count!" });

    if (_rewardData.length === 0)
        return res_.send({ result: false, error: "No Rewards!" });

    // console.log("getReward log - 2 : ", _rewardData);
    let _totalReward = 0;
    for (let i = 0; i < _rewardData.length; i++) {
        console.log("getReward log - 2 : ", parseFloat(_rewardData[i].amount));
        _totalReward += parseFloat(_rewardData[i].amount)
        console.log("getReward log - 2 : ", parseFloat(_totalReward));
    }

    console.log("getReward log - 3 : ", _totalReward);

    // const approvedSendTx = new AccountAllowanceApproveTransaction().approveHbarAllowance(operatorId, AccountId.fromString(_accountId), _totalReward)
    //     .freezeWith(client);
    // const approvedSendSign = await approvedSendTx.sign(operatorKey);
    // const approvedSendSubmit = await approvedSendSign.execute(client);
    // const approvedSendRx = await approvedSendSubmit.getReceipt(client);
    // if (approvedSendRx.status._code != 22)
    //     return res_.send({ result: false, error: "Something wrong with - 3." });

    return res_.send({ result: true, data: { amount: _totalReward } });
}

exports.requestReward = async (req_, res_) => {
    const _accountId = req_.query.accountId;
    const _amount = req_.query.amount;

    if (!_accountId || !_amount)
        return res_.send({ result: false, error: "Invalid post data!" });

    const _rewardData = await RewardInfo.find({ accountId: _accountId, status: "pending" });
    if (!_rewardData)
        return res_.send({ result: false, error: "Something wrong with staked NFT count!" });

    if (_rewardData.length === 0)
        return res_.send({ result: true, error: "No new Rewards!" });

    let _totalReward = 0;
    for (let i = 0; i < _rewardData.length; i++) {
        console.log("getReward log - 2 : ", parseFloat(_rewardData[i].amount));
        _totalReward += parseFloat(_rewardData[i].amount)
        console.log("getReward log - 2 : ", parseFloat(_totalReward));
    }

    // if (_totalReward < _amount)
    //     return res_.send({ result: false, error: "Invalid post data!" });

    await RewardInfo.updateMany({ accountId: _accountId, status: "pending" }, { status: "approved" });

    const approvedSendTx = new AccountAllowanceApproveTransaction().approveHbarAllowance(operatorId, AccountId.fromString(_accountId), _totalReward)
        .freezeWith(client);
    const approvedSendSign = await approvedSendTx.sign(operatorKey);
    const approvedSendSubmit = await approvedSendSign.execute(client);
    const approvedSendRx = await approvedSendSubmit.getReceipt(client);
    if (approvedSendRx.status._code != 22)
        return res_.send({ result: false, error: "Something wrong with - 3." });

    return res_.send({ result: true, data: "success" });
}

exports.claimSuccess = async (req_, res_) => {
    const _accountId = req_.body.accountId;

    if (!_accountId)
        return res_.send({ result: false, error: "Invalid post data!" });

    await RewardInfo.updateMany({ accountId: _accountId }, { status: "success" });

    return res_.send({ result: true, data: "success" });
}

//======================================================================================================

const getWalletBalance = async (accountId_) => {
    console.log("getWalletBalance log - 1 : ", accountId_);
    const _accountInfo = await axios.get(`https://mainnet-public.mirrornode.hedera.com/api/v1/balances?account.id=${accountId_}`);
    if (!_accountInfo || !_accountInfo.data) {
        return -1;
    }

    let _balance = _accountInfo.data.balances[0].balance;
    return _balance;
}

const filterObject = (target_, filter_) => {
    const _result = target_.filter(function (item) {
        for (var key in filter_) {
            if (item[key] === undefined || item[key] !== filter_[key])
                return false;
        }
        return true;
    });
    return _result;
}