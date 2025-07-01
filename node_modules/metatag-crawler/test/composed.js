var fs = require('fs');
var path = require('path');
var cheerio = require('cheerio');
var expect = require('chai').expect;

var metaTagParser = require('../src/composer');

describe('Parsing the entire html page', function () {
    var result;

    before(function () {
        var html = fs.readFileSync(path.resolve(__dirname, './html/composed.html'));
        var $ = cheerio.load(html);
        result = metaTagParser($);
    });

    it('All tags should be parsed correctly', function () {
        expect(result).to.have.property('meta');
        expect(result.meta).to.have.keys('title', 'description', 'canonical');

        expect(result).to.have.property('images');
        expect(result.images).to.have.length(2);

        expect(result).to.have.property('og');
        expect(result.og).to.have.any.keys('title', 'description', 'images', 'videos');
    });
});
