const functions = require("firebase-functions");

// // Create and deploy your first functions
// // https://firebase.google.com/docs/functions/get-started
//
exports.helloWorld = functions.https.onRequest((request, response) => {
    
  functions.logger.info("Hello logs!", {structuredData: true, req: request.body});
  response.send("Hello from Firebase!");
});
