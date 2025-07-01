var fs = require('fs');
var path = require('path');
var cheerio = require('cheerio');
var expect = require('chai').expect;

var imageParser = require('../src/image-parser');

describe('Parsing images from the page', function () {
    var parsedImages;

    before(function () {
        var html = fs.readFileSync(path.resolve(__dirname, './html/images.html'));
        var $ = cheerio.load(html);
        parsedImages = imageParser($);
    });

    it('All img sources are parsed correctly', function() {
        expect(parsedImages).to.not.be.undefined;
        expect(parsedImages).to.have.length(2);

        expect(parsedImages[0].url).to.equal('image-url');
        expect(parsedImages[0].width).to.be.undefined;

        expect(parsedImages[1].url).to.equal('image-url-2');
        expect(parsedImages[1].width).to.equal(300);
        expect(parsedImages[1].height).to.equal(200);
    });
});
