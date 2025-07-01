var fs = require('fs');
var path = require('path');
var cheerio = require('cheerio');
var expect = require('chai').expect;

var metaTagParser = require('../src/open-graph-tag-parser');

describe('Parsing title and meta[name=description] from html', function () {
    var parsedTags;

    before(function () {
        var html = fs.readFileSync(path.resolve(__dirname, './html/open-graph.html'));
        var $ = cheerio.load(html);
        parsedTags = metaTagParser($);
    });

    it('Basic open graph tags are parsed correctly', function () {
        expect(parsedTags).to.have.property('title', "test-title");
        expect(parsedTags).to.have.property('description', "test-description");
        expect(parsedTags).to.have.property('url', "test-url");
        expect(parsedTags).to.have.property('type', "test-type");
        expect(parsedTags).to.have.property('site_name', "test-site_name");
    });

    it('Images are parsed correctly', function () {
        expect(parsedTags.images).to.not.be.undefined;
        expect(parsedTags.images).to.have.length(2);

        expect(parsedTags.images[0]).to.have.property('url', 'test-image-url');
        expect(parsedTags.images[0]).to.have.property('secure_url', 'test-image-secure_url');
        expect(parsedTags.images[0]).to.have.property('width', 1024);
        expect(parsedTags.images[0]).to.have.property('height', 768);
        expect(parsedTags.images[0]).to.have.property('type', 'image/jpeg');

        expect(parsedTags.images[1]).to.have.property('type', 'image/png');
    });

    it('Videos are parsed correctly', function () {
        expect(parsedTags.videos).to.not.be.undefined;
        expect(parsedTags.videos).to.have.length(2);

        expect(parsedTags.videos[0]).to.have.property('url', 'test-video-url');
        expect(parsedTags.videos[0]).to.have.property('secure_url', 'test-video-secure_url');
        expect(parsedTags.videos[0]).to.have.property('width', 1280);
        expect(parsedTags.videos[0]).to.have.property('height', 720);
        expect(parsedTags.videos[0]).to.have.property('type', 'text/html');

        expect(parsedTags.videos[1]).to.have.property('type', 'application/x-shockwave-flash');

    });
});
