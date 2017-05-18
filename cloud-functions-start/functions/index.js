const functions = require('firebase-functions');
const admin = require('firebase-admin');
const gcs = require('@google-cloud/storage')();
const vision = require('@google-cloud/vision')();
const { exec } = require('child-process-promise');

admin.initializeApp(functions.config().firebase);

exports.blurBadImages = functions.storage.object().onChange(({ data }) => {
  const bucket = gcs.bucket(data.bucket);
  const file = bucket.file(data.name);
  return vision.detectSafeSearch(file).then(([{ adult, violence }]) => {
    if (!adult) {
      console.log('adult check', 'passed');
      return;
    }

    if (!violence) {
      console.log('violence check', 'passed');
      return;
    }

    console.log('Bad image');
    return blurImage(data.name, bucket);
  });
});

const blurImage = (filepath, bucket) => {
  return bucket
    .file(filepath)
    .download({ destination: '/tmp/foobar' })
    .then(() =>
      exec('convert' + tmpfile + ' -channel RGBA -blur 0x24' + tmpfile)
    )
    .then(() => bucket.upload('/tmp/foobar', { destination: filepath }))
    .then(() =>
      admin.database().ref('/messages/foobar').update({ moderated: true })
    )
    .then(() => console.log('DONE'));
};

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
      console.log(JSON.stringify(data.previous.key));
      return;
    }

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
