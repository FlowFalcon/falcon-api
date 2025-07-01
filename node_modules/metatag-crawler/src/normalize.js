module.exports = function(text) {
    return (text && text.trim && text.trim().replace(/\s+/g, ' ')) || '';
};
