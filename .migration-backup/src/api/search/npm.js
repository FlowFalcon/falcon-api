module.exports = function (app) {
app.get('/search/npm', async (req, res) => {
       const { q } = req.query
        try {
     let data = await fetchJson(`https://registry.npmjs.com/-/v1/search?text=${encodeURIComponent(q)}`)
    let hasil = []
    for (let i of data.objects.slice(0, 20)) {
    hasil.push({
    title: i.package.name + "@^" + i.package.version, 
    download: i.downloads, 
    author: i.package.publisher.username, 
    update: i.package.date, 
    links: i.package.links
    })
    }
            const results = await hasil
            res.status(200).json({
                status: true,
                result: results
            });
        } catch (error) {
            res.status(500).send(`Error: ${error.message}`);
        }
});
}