# metadata-crawler

This is a simple node.js module for scraping meta information from web pages.

At the moment this module supports:
* the `<title>` tag in the document head
* meta[name="description"] tag
* link[rel="canonical"] tag
* img elements on the page
* many [Open Graph](http://ogp.me/) tags (such as: title, description, url, type, image, video)


## Install

```
npm install metatag-crawler --save
```

## Usage
```
var scrape = require('metatag-crawler');
scrape('https://www.youtube.com/watch?v=jNQXAC9IVRw', function(err, data) {});

// if you do not want the relative URLs to be resolved
scrape('https://www.youtube.com/watch?v=jNQXAC9IVRw', { resolveUrls: false }, function(err, data) {});    
```

## Example

```JavaScript
var scrape = require('metatag-crawler');
scrape('https://www.youtube.com/watch?v=jNQXAC9IVRw', function(err, data) {
    console.log(err); // null
    console.log(data.meta.title); // Me at the zoo
    console.log(data.meta.description); // The first video on YouTube. Maybe it's time to go back to the zoo?
    console.log(data.meta.canonical); // https://www.youtube.com/watch?v=jNQXAC9IVRw

    console.log(data);
    /*
    {
        "meta": {
            "title": "Me at the zoo - YouTube",
            "description": "The first video on YouTube. Maybe it's time to go back to the zoo?",
            "canonical": "https://www.youtube.com/watch?v=jNQXAC9IVRw"
        },
        "images": [
            {
                "url": "https://s.ytimg.com/yts/img/pixel-vfl3z5WfW.gif"
            },
            {
                "url": "https://s.ytimg.com/yts/img/pixel-vfl3z5WfW.gif",
                "width": 48,
                "height": 48
            },
            {
                "url": "https://s.ytimg.com/yts/img/pixel-vfl3z5WfW.gif",
                "width": 120,
                "height": 90
            },
            {
                "url": "https://s.ytimg.com/yts/img/pixel-vfl3z5WfW.gif",
                "width": 120,
                "height": 90
            },
            {
                "url": "https://s.ytimg.com/yts/img/pixel-vfl3z5WfW.gif",
                "width": 120,
                "height": 90
            },
            {
                "url": "https://s.ytimg.com/yts/img/pixel-vfl3z5WfW.gif",
                "width": 120,
                "height": 90
            },
            {
                "url": "https://s.ytimg.com/yts/img/pixel-vfl3z5WfW.gif",
                "width": 120,
                "height": 90
            },
            {
                "url": "https://s.ytimg.com/yts/img/pixel-vfl3z5WfW.gif",
                "width": 120,
                "height": 90
            },
            {
                "url": "https://s.ytimg.com/yts/img/pixel-vfl3z5WfW.gif",
                "width": 120,
                "height": 90
            },
            {
                "url": "https://s.ytimg.com/yts/img/pixel-vfl3z5WfW.gif",
                "width": 120,
                "height": 90
            },
            {
                "url": "https://s.ytimg.com/yts/img/pixel-vfl3z5WfW.gif",
                "width": 120,
                "height": 90
            },
            {
                "url": "https://s.ytimg.com/yts/img/pixel-vfl3z5WfW.gif",
                "width": 120,
                "height": 90
            },
            {
                "url": "https://s.ytimg.com/yts/img/pixel-vfl3z5WfW.gif",
                "width": 120,
                "height": 90
            },
            {
                "url": "https://s.ytimg.com/yts/img/pixel-vfl3z5WfW.gif",
                "width": 120,
                "height": 90
            },
            {
                "url": "https://s.ytimg.com/yts/img/pixel-vfl3z5WfW.gif",
                "width": 120,
                "height": 90
            },
            {
                "url": "https://s.ytimg.com/yts/img/pixel-vfl3z5WfW.gif",
                "width": 120,
                "height": 90
            },
            {
                "url": "https://s.ytimg.com/yts/img/pixel-vfl3z5WfW.gif",
                "width": 120,
                "height": 90
            },
            {
                "url": "https://s.ytimg.com/yts/img/pixel-vfl3z5WfW.gif",
                "width": 120,
                "height": 90
            },
            {
                "url": "https://s.ytimg.com/yts/img/pixel-vfl3z5WfW.gif",
                "width": 120,
                "height": 90
            },
            {
                "url": "https://s.ytimg.com/yts/img/pixel-vfl3z5WfW.gif",
                "width": 120,
                "height": 90
            },
            {
                "url": "https://s.ytimg.com/yts/img/pixel-vfl3z5WfW.gif",
                "width": 120,
                "height": 90
            },
            {
                "url": "https://s.ytimg.com/yts/img/pixel-vfl3z5WfW.gif",
                "width": 120,
                "height": 90
            }
        ],
        "og": {
            "title": "Me at the zoo",
            "description": "The first video on YouTube. Maybe it's time to go back to the zoo?",
            "url": "https://www.youtube.com/watch?v=jNQXAC9IVRw",
            "site_name": "YouTube",
            "type": "video",
            "images": [
                {
                    "url": "https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg"
                }
            ],
            "videos": [
                {
                    "url": "https://www.youtube.com/embed/jNQXAC9IVRw",
                    "secure_url": "https://www.youtube.com/embed/jNQXAC9IVRw",
                    "type": "text/html",
                    "width": 480,
                    "height": 360
                },
                {
                    "url": "http://www.youtube.com/v/jNQXAC9IVRw?version=3&autohide=1",
                    "secure_url": "https://www.youtube.com/v/jNQXAC9IVRw?version=3&autohide=1",
                    "type": "application/x-shockwave-flash",
                    "width": 480,
                    "height": 360
                }
            ]
        }
    }
    */
});
```

## Changes in version 2.x

In version 2 the module does not automatically merge properties from different meta information sources.
Earlier we used to the the following: `title = opengpraph.title || meta.title` and so on with description and canonical url.

This is no longer the case, we provide all information available on the page. If you need the old behavior, please process the result like this:
```JavaScript
scrape('https://www.youtube.com/watch?v=jNQXAC9IVRw', function(err, data) {
    var oldStyleData = {
        title: data.og.title || data.meta.title,
        description: data.og.descriptions || data.meta.description,
        images: og.images,
        videos: og.videos
    };

    // ... do what you used to do before with the oldStyleData
});
```
