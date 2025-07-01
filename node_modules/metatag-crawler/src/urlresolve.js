var util = require('util');
var URL = require('url');

module.exports = function resolveUrlsInObj(obj, baseUrl) {
    for (var key in obj) {
        if (util.isObject(obj[key])) {
            resolveUrlsInObj(obj[key], baseUrl);
        } else if (util.isString(obj[key]) && (key === 'url' || key === 'secure_url' || key === 'canonical')) {
            obj[key] = URL.resolve(baseUrl, obj[key]);
        }
    }

    return obj;
};
