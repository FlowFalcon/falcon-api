var normalizeText = require('./normalize');

module.exports = function($) {
    return {
        title: readOgTag('title'),
        description: readOgTag('description'),
        url: readOgTag('url'),
        site_name: readOgTag('site_name'),
        type: readOgTag('type'),
        images: images(),
        videos: videos()
    }

    function readOgTag(name) {
        return normalizeText($('meta[property="og:' + name + '"]').attr('content'));
    }

    function images() {
        var images = [];

        [].forEach.call($('meta[property^="og:image"]'), function (el) {
            var $el = $(el);
            var propName = $el.attr('property');
            var content = $el.attr('content');

            if (propName === 'og:image' || propName === 'og:image:url') {
                images.push({ url: content });
            }

            var currentVideo = images[images.length - 1] || {};

            switch (propName) {
                case 'og:image:secure_url':
                    currentVideo.secure_url = content;
                    break;
                case 'og:image:type':
                    currentVideo.type = content;
                    break;
                case 'og:image:width':
                    currentVideo.width = parseInt(content, 10);
                    break;
                case 'og:image:height':
                    currentVideo.height = parseInt(content, 10);
                    break;
            }
        });

        return images;
    }

    function videos() {
        var videos = [];

        [].forEach.call($('meta[property^="og:video"]'), function (el) {
            var $el = $(el);
            var propName = $el.attr('property');
            var content = $el.attr('content');

            if (propName === 'og:video' || propName === 'og:video:url') {
                videos.push({url: content});
            }

            var currentVideo = videos[videos.length - 1];

            switch (propName) {
                case 'og:video:secure_url':
                    currentVideo.secure_url = content;
                    break;
                case 'og:video:type':
                    currentVideo.type = content;
                    break;
                case 'og:video:width':
                    currentVideo.width = parseInt(content, 10);
                    break;
                case 'og:video:height':
                    currentVideo.height = parseInt(content, 10);
                    break;
            }
        });

        return videos;
    }
};
