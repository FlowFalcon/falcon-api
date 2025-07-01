// var scrape = require('../');
// var chai = require('chai');
// var expect = chai.expect;
//
// describe('Scraping YouTube home page', function() {
//     it('should retrieve title, description, canonical and image correctly', function(done) {
//         this.timeout(5000);
//         scrape('https://www.youtube.com/?hl=en', function(err, data) {
//             expect(data.title).to.equal('YouTube');
//             expect(data.description).to.equal('Share your videos with friends, family, and the world');
//             expect(data.canonical).to.equal('https://www.youtube.com/');
//             expect(data.images.length).to.equal(1);
//             expect(data.images[0].url).to.equal('//s.ytimg.com/yts/img/yt_1200-vfl4C3T0K.png');
//             done();
//         });
//     });
// });
//
// describe('Scraping a YouTube video', function() {
//     it('should retrieve images and video correctly', function(done) {
//         this.timeout(5000);
//         scrape('https://www.youtube.com/watch?v=jNQXAC9IVRw&hl=en', function(err, data) {
//             expect(data.title).to.equal('Me at the zoo');
//             expect(data.description).to.equal('The first video on YouTube. Maybe it\'s time to go back to the zoo?');
//             expect(data.canonical).to.equal('https://www.youtube.com/watch?v=jNQXAC9IVRw');
//
//             expect(data.images.length).to.equal(1);
//             expect(data.images[0].url).to.equal('https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg');
//
//             expect(data.videos.length).to.equal(2);
//             expect(data.videos[0]).to.deep.equal({
//                 "height": 360,
//                 "type": "text/html",
//                 "url": "https://www.youtube.com/embed/jNQXAC9IVRw",
//                 "width": 480
//             });
//             expect(data.videos[1]).to.deep.equal({
//                 "height": 360,
//                 "type": "application/x-shockwave-flash",
//                 "url": "https://www.youtube.com/v/jNQXAC9IVRw?version=3&autohide=1",
//                 "width": 480
//             });
//
//             done();
//         });
//     });
// });
