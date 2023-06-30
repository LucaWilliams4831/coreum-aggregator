const { User } = require('../../db');

exports.getUserInfo = async (req, res) => {
    console.log('getUserInfo log - 1 : ', req.query);
    try {
        const avatarUrl = atob(req.query.avatarUrl);
        const name = atob(req.query.name);
        const fullName = atob(req.query.fullName);
        console.log('getUserInfo log - 2 : ', avatarUrl, name, fullName);

        const totalUsers = await User.find({});

        const findUser = await User.findOne({ name: name });
        console.log('getUserInfo log - 3 : ', findUser);

        const rank = findUser === null ? totalUsers.length + 1 : findUser.rank;
        const xp = findUser === null ? '0' : findUser.xp;
        const quests = findUser === null ? '0' : findUser.quests;

        const newUser = new User({
            fullName: fullName,
            name: name,
            avatarUrl: avatarUrl,
            rank: rank,
            xp: xp,
            quests: quests
        });

        console.log('getUserInfo log - 4 : ', newUser);

        if (findUser === null)
            await newUser.save();

        return res.send({ result: true, data: newUser });
    } catch (error) {
        return res.send({ result: false, error: 'Error with code!' });
    }
}

exports.claimXp = async (req, res) => {
    console.log('claimXp log - 1 : ', req.query);
    try {
        const name = atob(req.query.name);
        const xp = atob(req.query.xp);
        console.log('claimXp log - 2 : ', name, xp);

        const findUser = await User.findOne({ name: name });
        console.log('claimXp log - 3 : ', findUser);

        const newXp = parseInt(findUser.xp) + parseInt(xp);
        console.log('claimXp log - 4 : ', newXp);
        const newQuests = parseInt(findUser.quests) + 1;
        const updateResult = await User.updateOne({ name: name }, { xp: newXp, quests: newQuests });
        console.log('claimXp log - 5 : ', updateResult);

        const updatedUser = await User.findOne({ name: name });
        return res.send({ result: true, data: updatedUser });

    } catch (error) {
        return res.send({ result: false, error: 'Error with code!' });
    }
}

exports.getAll = async (req, res) => {
    console.log('getAll log - 1');
    try {
        const users = await User.find({});
        return res.send({ result: true, data: users });
    } catch (error) {
        return res.send({ result: false, error: 'Error with code!' });
    }
}