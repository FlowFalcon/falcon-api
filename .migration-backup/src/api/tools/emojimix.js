const fetch = require("node-fetch")

module.exports = function(app) {
app.get('/tools/emojimix', async (req, res) => {
const { emoji1, emoji2 } = req.query
let img = await fetch(`https://tenor.googleapis.com/v2/featured?key=AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ&contentfilter=high&media_filter=png_transparent&component=proactive&collection=emoji_kitchen_v5&q=${encodeURIComponent(emoji1)}_${encodeURIComponent(emoji2)}`).then(resd => resd.json()).then(resu => resu.results[0].url)
const image = await getBuffer(img)
        try {
            res.writeHead(200, {
                'Content-Type': 'image/png',
                'Content-Length': image.length,
            });
            res.end(image);
        } catch (error) {
            res.status(500).send(`Error: ${error.message}`);
        }
});
}