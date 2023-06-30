const express = require('express');
const router = express.Router();
const stake = require("./controller");

// staking
router.post('/stake_new_nfts', stake.stakeNewNfts);
router.get('/load_staked_nfts', stake.loadStakedNfts);
router.post('/unstake_nft', stake.unstakeNft);
router.post('/refresh_data', stake.refreshData);

//admin
router.post('/deposit_treasury', stake.depositToTreasury);
router.post('/distribute_request', stake.distributeRequest);
router.get('/staked_nft_count', stake.stakedNftCount);
router.get('/get_available_balance', stake.getAvailableBalance);
router.get('/get_reward', stake.getReward);
router.get('/request_reward', stake.requestReward);
router.post('/claim_success', stake.claimSuccess);

module.exports = router;