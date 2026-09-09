const axios = require('axios');
const cheerio = require('cheerio');
 
const fdroid = {
  search: async (query) => {
    try {
        const response = await axios.get('https://search.f-droid.org/?q=' + query + '&lang=id');
        const html = response.data;
        const $ = cheerio.load(html);
        const apps = [];
 
        $('a.package-header').each((index, element) => {
            const appName = $(element).find('h4.package-name').text().trim();
            const appDesc = $(element).find('span.package-summary').text().trim();
            const appLink = $(element).attr('href');
            const appIcon = $(element).find('img.package-icon').attr('src');
            const appLicense = $(element).find('span.package-license').text().trim();
 
            apps.push({
                name: appName,
                description: appDesc,
                link: appLink,
                icon: appIcon,
                license: appLicense
            });
        });
 
        return apps;
    } catch (error) {
        console.error('Error fetching apps:', error);
    }
  },
  detail: async (url) => {
    try {
        const response = await axios.get(url);
        const html = response.data;
        const $ = cheerio.load(html);
        const appDetails = {};
 
        const versionElement = $('li.package-version#latest');
        const versionText = versionElement.find('.package-version-header').text().trim();
        const versionMatch = versionText.match(/Versi\s+([\d.]+)/);
 
        appDetails.version = versionMatch ? versionMatch[1] : versionText.replace(/[^0-9.]/g, '').split(/\s+/)[0];
        appDetails.addedOn = versionElement.find('.package-version-header').text().match(/Ditambahkan pada (.+)/)?.[1].trim();
        appDetails.requirement = versionElement.find('.package-version-requirement').text().trim();
        appDetails.sourceLink = versionElement.find('.package-version-source a').attr('href');
        appDetails.permissions = versionElement.find('.package-version-permissions .no-permissions').text().trim() || 'Permissions not listed';
        appDetails.downloadLink = versionElement.find('.package-version-download a').attr('href');
        appDetails.apkSize = versionElement.find('.package-version-download').contents().filter(function() {
            return this.nodeType === 3;
        }).text().trim().split('|')[0].trim();
 
        return appDetails;
    } catch (error) {
        console.error('Error fetching app details:', error);
    }
  }
};


module.exports = function (app) {
app.get('/search/fdroid', async (req, res) => {
       const { q } = req.query
        try {
            const results = await fdroid.search(q);  
            res.status(200).json({
                status: true,
                result: results
            });
        } catch (error) {
            res.status(500).send(`Error: ${error.message}`);
        }
});
}