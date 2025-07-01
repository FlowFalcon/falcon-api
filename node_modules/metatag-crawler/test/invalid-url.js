var expect = require('chai').expect;
var crawl = require('../src');


describe('When providing an invalid domain or address', function () {
    var crawlError;
    var crawlData;

    before(function (done) {
        crawl('http://example.invalid.domain123', function(err, data)  {
            crawlError = err;
            crawlData = data;
            done();
        });
    });

    it('An error object must be provided', function () {
        expect(crawlError).to.be.ok;
        expect(crawlError.code).to.equal('ENOTFOUND');
        expect(crawlData).to.be.undefined;
    });
});
