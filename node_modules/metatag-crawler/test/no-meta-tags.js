var fs = require('fs');
var path = require('path');
var cheerio = require('cheerio');
var expect = require('chai').expect;

var metaTagParser = require('../src/meta-tag-parser');

describe('When no meta information exists in the html', function () {
    var parsedTags;

    before(function () {
        var html = fs.readFileSync(path.resolve(__dirname, './html/no-meta-tags.html'));
        var $ = cheerio.load(html);
        parsedTags = metaTagParser($);
    });

    it('Title, description and canonical must be empty strings', function () {
        expect(parsedTags).to.have.property('title', '');
        expect(parsedTags).to.have.property('description', '');
        expect(parsedTags).to.have.property('canonical', '');

        // TODO: check og properties as well
    });
});
