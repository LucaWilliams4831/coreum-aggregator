const express = require('express');
const router = express.Router();
const user = require('./controller');

router.get('/get_user_info', user.getUserInfo);
router.get('/claim_xp', user.claimXp);
router.get('/get_all', user.getAll);

module.exports = router;