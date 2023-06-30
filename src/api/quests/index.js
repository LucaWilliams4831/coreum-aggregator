const express = require('express');
const router = express.Router();
const quests = require('./controller');

router.get('/get_all_quests', quests.getAllQuests);

module.exports = router;