module.exports = function (app) {

function listRoutes() {
    let anuan = app._router.stack
        .filter(layer => layer.route)
        .map(layer => ({
            method: Object.keys(layer.route.methods).join(', ').toUpperCase(),
            path: layer.route.path
        }));        
     return anuan.length - 1
}

app.get('/api/status', async (req, res) => {
        try {
            res.status(200).json({
                status: true,
                result: {
                status: "Aktif", 
                totalrequest: global.totalreq.toString(), 
                totalfitur: `${listRoutes()}`, 
                runtime: runtime(process.uptime()), 
                domain: req.hostname
                }
            });
        } catch (error) {
            res.status(500).send(`Error: ${error.message}`);
        }
});
}