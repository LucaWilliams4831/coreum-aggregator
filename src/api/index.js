const express = require('express');
const User = require('./user');
const Quests = require('./quests');

const router = express.Router();
router.use('/user', User);
router.use('/quests', Quests);

module.exports = router;
