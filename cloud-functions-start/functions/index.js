const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp(functions.config().firebase);

exports.addWelcomeMessage = functions.auth.user().onCreate(event => {
  console.log(JSON.stringify(event));

  return admin.database().ref('messages').push({
    name: 'Foo Bar',
    photoUrl: '/images/firebase-logo.png',
    text: `${event.data.displayName || 'Unknown display name'} has joined the chat!`
  });
});

exports.sendNotification = functions.database
  .ref('/messages/{messageId}')
  .onWrite(({ data }) => {
    if (data.previous.val()) {
        console.log(JSON.stringify(data.previous.key))
        return;
    };

    const { name, text, photoUrl } = data.val();
    const payload = {
      notification: {
        title: `${name} said something`,
        body: text || '',
        icon: photoUrl || '/images/profile_placeholder.png',
        click_action: `https://${functions.config().firebase.authDomain}`
      }
    };

    console.log(payload);

    return admin.database().ref('fcmTokens').once('value').then(alltokens => {
      if (!alltokens.val()) return;
      return admin
        .messaging()
        .sendToDevice(Object.keys(alltokens.val()), payload);
    });
  });
