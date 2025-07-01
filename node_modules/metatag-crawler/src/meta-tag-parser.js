var normalizeText = require('./normalize');

module.exports = function($) {
    return {
        title: title(),
        description: description(),
        canonical: canonical()
    };

    function title() {
        return normalizeText($('head title').text());
    }

    function description() {
        return normalizeText($('meta[name="description"]').attr('content'));
    }

    function canonical() {
        return normalizeText($('link[rel=canonical]').attr('href'));
    }
};
