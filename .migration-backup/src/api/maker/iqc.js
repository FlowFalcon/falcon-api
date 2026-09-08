const { generateIQC } = require('iqc-canvas');

function randomBattery() {
    return Math.floor(Math.random() * (100 - 20 + 1) + 20).toString();
}

function randomTime() {
    const hours = Math.floor(Math.random() * 24).toString().padStart(2, '0');
    const minutes = Math.floor(Math.random() * 60).toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

function randomBoolean() {
    return Math.random() > 0.5;
}

module.exports = (app) => {
    app.get('/maker/iqc', async (req, res) => {
        const { text } = req.query;

        if (!text) {
            return res.status(400).json({
                status: false,
                error: 'Parameter "text" diperlukan'
            });
        }

        // Random semua parameter
        const randomTimeValue = randomTime();
        const randomBateraiValue = randomBattery();
        const randomOperatorValue = randomBoolean();
        const randomTimebarValue = randomBoolean();
        const randomWifiValue = randomBoolean();

        try {
            const result = await generateIQC(text, randomTimeValue, {
                baterai: [true, randomBateraiValue],
                operator: randomOperatorValue,
                timebar: randomTimebarValue,
                wifi: randomWifiValue
            });

            if (!result.success) {
                throw new Error(result.message || 'Gagal generate IQC');
            }

            const imageBuffer = Buffer.from(result.image);
            
            res.setHeader('Content-Type', result.mimeType || 'image/png');
            res.setHeader('Content-Disposition', 'attachment; filename="iqc.png"');
            res.send(imageBuffer);

        } catch (error) {
            console.error(error);
            res.status(500).json({
                status: false,
                error: error.message || 'Gagal generate gambar IQC'
            });
        }
    });
};
