module.exports = function($) {
    return images();

    function images() {
        var images = $('img');
        var urls = [];

        images.each(function(idx, element) {
            var url = $(this).attr('src');
            var width = $(this).attr('width');
            var height = $(this).attr('height');
            var img = { url: url };
            if (width) { img.width = parseInt(width, 10); }
            if (height) { img.height = parseInt(height, 10); }

            urls.push(img);
        });

        return urls;
    }
};
