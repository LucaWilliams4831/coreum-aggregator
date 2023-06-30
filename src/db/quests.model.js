module.exports = (mongoose) => {
    const dbModel = mongoose.model(
        'quests',
        mongoose.Schema(
            {
                type: {type: String, default: ''},
                title: { type: String, default: '' },
                detail: {type: String, default: ''},
                reward: { type: String, default: '' },
                description: { type: String, default: '' }
            },
            { timestamps: true }
        )
    );
    return dbModel;
};
