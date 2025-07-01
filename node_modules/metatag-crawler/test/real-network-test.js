var fs = require('fs');
var path = require('path');
var expect = require('chai').expect;
var crawl = require('../src');

describe('When crawling a youtube video pages (over real network)', function () {
    var crawlResults;

    before(function(done) {
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
