var fs = require('fs');
var path = require('path');
var nock = require('nock');
var expect = require('chai').expect;
var crawl = require('../src');

describe('When crawling youtube video page', function () {
    var crawlResults;

    before(function(done) {
        var youtubeResult = fs.readFileSync(path.resolve(__dirname, './html/youtube-video-page.html'));
        nock('https://www.youtube.com').get('/watch').query(true).reply(200, youtubeResult);
        crawl('https://www.youtube.com/watch?v=jNQXAC9IVRw', function(err, data) {
            crawlResults = data;
            done();
        });
    });

    it('Results should be fine', function () {
        expect(crawlResults).to.have.all.keys('meta', 'images', 'og');
        expect(crawlResults.meta.title).to.equal('Me at the zoo - YouTube');
        expect(crawlResults.og.title).to.equal('Me at the zoo');
        expect(crawlResults.og.images[0].url).to.be.ok;
        expect(crawlResults.og.videos[0].url).to.be.ok;
    });
});

describe('When crawling youtube home page', function () {
    var crawlResults;

    before(function(done) {
        var youtubeResult = fs.readFileSync(path.resolve(__dirname, './html/youtube-home-page.html'));
        nock('https://www.youtube.com').get('/').query(true).reply(200, youtubeResult);
        crawl('https://www.youtube.com/', function(err, data) {
            crawlResults = data;
            done();
        });
    });

    it('the esults should be fine', function () {
        expect(crawlResults).to.have.all.keys('meta', 'images', 'og');
        expect(crawlResults.meta.title).to.equal('YouTube');
        expect(crawlResults.og.title).to.equal('');
        expect(crawlResults.og.images[0].url).to.equal('https://s.ytimg.com/yts/img/yt_1200-vfl4C3T0K.png');
    });
});
