var fs = require('fs');
var path = require('path');
var nock = require('nock');
var expect = require('chai').expect;
var crawl = require('../src');

describe('When crawling youtube home page with { resolveUrls: true }', function () {
    var crawlResults;

    before(function(done) {
        var youtubeResult = fs.readFileSync(path.resolve(__dirname, './html/youtube-home-page.html'));
        nock('https://www.youtube.com').get('/').query(true).reply(200, youtubeResult);
        crawl('https://www.youtube.com/', { resolveUrls: true }, function(err, data) {
            crawlResults = data;
            done();
        });
    });

    it('Urls in crawling result must be absolute', function () {
        expect(crawlResults.og.images[0].url).to.equal('https://s.ytimg.com/yts/img/yt_1200-vfl4C3T0K.png');
    });
});
