var util = require('util');
var request = require('request');
var cheerio = require('cheerio');

var compose = require('./composer');
var resolveUrlsInObj = require('./urlresolve');

module.exports = function scrapeUrl(url, options, cb) {
    if (util.isFunction(options)) {
        cb = options;
    }

    var options = {
        url: url,
        headers: {
            'User-Agent': options.userAgent || 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2490.80 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
    };

    request.get(options, function(err, response, body) {
        if (err) { return cb(err); }

        var $ = cheerio.load(body);
        var result = compose($, url);

        if (options.resolveUrls !== false) {
            resolveUrlsInObj(result, url);
        }

        cb(null, result);
    });
};
