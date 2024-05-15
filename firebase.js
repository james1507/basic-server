// firebase.js
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: "james-shop-3a23f",
  databaseURL: "https://james-shop-3a23f.firebaseio.com",
  
});

module.exports = admin;
