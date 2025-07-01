var metaTagParser = require('./meta-tag-parser');
var imageParser = require('./image-parser');
var ogparser = require('./open-graph-tag-parser');

module.exports = function($) {
    return {
        meta: metaTagParser($),
        images: imageParser($),
        og: ogparser($)
    };
};
