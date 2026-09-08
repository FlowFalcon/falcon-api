module.exports = function(app) {
    async function bluearchive() {
        try {
            const data = await fetchJson(`https://raw.githubusercontent.com/rynxzyy/blue-archive-r-img/refs/heads/main/links.json`)
            const response = await getBuffer(data[Math.floor(data.length * Math.random())])
            return response
        } catch (error) {
            throw error;
        }
    }
    app.get('/random/ba', async (req, res) => {
        try {
            const pedo = await bluearchive();
            res.writeHead(200, {
                'Content-Type': 'image/png',
                'Content-Length': pedo.length,
            });
            res.end(pedo);
        } catch (error) {
            res.status(500).send(`Error: ${error.message}`);
        }
    });
};
