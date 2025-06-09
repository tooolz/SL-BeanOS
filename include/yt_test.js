const fs = require('fs');
const ytdl = require('ytdl-core');

ytdl("KWQHTmIiukI", {quality: 'highestaudio'})
  .pipe(fs.createWriteStream('video.mp4'));