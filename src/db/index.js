const dbConfig = require('./config');
const mongoose = require("mongoose");
mongoose.Promise = global.Promise;

const db = {};
db.mongoose = mongoose;
db.url = dbConfig.url;

db.User = require('./user.model')(mongoose);
db.Quests = require('./quests.model')(mongoose);

module.exports = db;
