const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp(functions.config().firebase);

exports.addWelcomeMessage = functions.auth.user().onCreate(event => {
  console.log(JSON.stringify(event));

  return admin.database().ref('messages').push({
      name: 'Foo Bar',
      photoUrl: '/images/firebase-logo.png',
      text: `${event.data.displayName || 'Unknown display name'} has joined the chat!`
  })
});
