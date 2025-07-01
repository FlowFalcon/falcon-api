var fs = require('fs');
var path = require('path');
var cheerio = require('cheerio');
var expect = require('chai').expect;

var metaTagParser = require('../src/meta-tag-parser');

describe('Parsing title, meta[name=description] and link[rel=canonical] from html', function () {
    var parsedTags;

    before(function () {
        var html = fs.readFileSync(path.resolve(__dirname, './html/meta-tags.html'));
        var $ = cheerio.load(html);
        parsedTags = metaTagParser($);
    });

    it('Title, description and canonical url are parsed correctly', function () {
        expect(parsedTags).to.have.property('title', 'THIS is A "TEST" Title!');
        expect(parsedTags).to.have.property('description', 'This is the meta-description.');
        expect(parsedTags).to.have.property('canonical', 'https://example.com/example.html?asdf=1234');
    });
});
