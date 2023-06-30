module.exports = (mongoose) => {
    const dbModel = mongoose.model(
        'user',
        mongoose.Schema(
            {
                fullName: {type: String, default: ''},
                name: { type: String, default: '' },
                avatarUrl: { type: String, default: '' },
                rank: { type: String, default: '1' },
                xp: { type: String, default: '0' },
                quests: { type: String, default: '0' },
                description: { type: String, default: '' }
            },
            { timestamps: true }
        )
    );
    return dbModel;
};


// avatar_url:"https://cdn.discordapp.com/avatars/1012028669272793159/4df3780117687a6c65bd2bf126114b1b.png"
// email:"topglinny@gmail.com"
// email_verified:true
// full_name:"CryptoShaker"
// iss:"https://discord.com/api"
// name:"CryptoShaker#0232"
// picture:"https://cdn.discordapp.com/avatars/1012028669272793159/4df3780117687a6c65bd2bf126114b1b.png"
// provider_id:"1012028669272793159"
// sub:"1012028669272793159"