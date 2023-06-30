const { Quests } = require('../../db');

exports.getAllQuests = async (req, res) => {
    console.log('getAllQuests log - 1 : ', req.query);
    try {
        const quests = await Quests.find({}, { _id: 0 });
        return res.send({ result: true, data: quests });
    } catch (error) {
        return res.send({ result: false, error: 'Error with code!' });
    }
}