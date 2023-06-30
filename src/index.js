const app = require("./app");
// const https = require("https");
// const fs = require("fs");

var server = require('http').createServer(app);
const port = process.env.PORT || 80;
server.listen(port, () => console.log(`Listening on port ${port}..`));

// const httpsPort = 2083;
// const privateKey = fs.readFileSync("/etc/letsencrypt/live/dapp.deragods.com/privkey.pem");
// const certificate = fs.readFileSync("/etc/letsencrypt/live/dapp.deragods.com/fullchain.pem");
// // const privateKey = fs.readFileSync("/etc/letsencrypt/live/pengupals.tech/privkey.pem");
// // const certificate = fs.readFileSync("/etc/letsencrypt/live/pengupals.tech/fullchain.pem");

// const credentials = {
//     key: privateKey,
//     cert: certificate,
// }

// https.createServer(credentials, app)
//     .listen(httpsPort, () => {
//         console.log(`plutopeer server is running at port ${httpsPort} as https.`);
//     });
