async function anim() {
        try {
            const data = `https://img12.pixhost.to/images/507/570627648_skyzopedia.jpg`
            const response = await getBuffer(data)
            return response
        } catch (error) {
            throw error;
        }
    }
module.exports = function app (app) {
app.get('/random/papayang', async (req, res) => {
        try {
            const pedo = await anim();
            res.writeHead(200, {
                'Content-Type': 'image/png',
                'Content-Length': pedo.length,
            });
            res.end(pedo);
        } catch (error) {
            res.status(500).send(`Error: ${error.message}`);
        }
    });
}
