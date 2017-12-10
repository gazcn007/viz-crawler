const fs = require('fs');

const CDP = require('chrome-remote-interface');
let wait = ms => new Promise(resolve => setTimeout(resolve, ms));

function loadForScrot(url) {
    return new Promise(async (fulfill, reject) => {
        const tab = await CDP.New();
        const client = await CDP({tab});
        const {Page} = client;
        Page.loadEventFired(async() => {
            await wait(6000);
            fulfill({client, tab});
        });
        await Page.enable();
        await Page.navigate({url});
    });
}

async function process(urls) {
    try {
        const handlers = await Promise.all(urls.map(loadForScrot));
        for (const {client, tab} of handlers) {
            const {Page, DOM} = client;
            await CDP.Activate({id: tab.id});
            const filename = `./scrot_${tab.id}.png`;
            var currentDate = '[' + new Date().toUTCString() + '] ';
            const result = await Page.captureScreenshot();
            const image = Buffer.from(result.data, 'base64');
            fs.writeFileSync(filename, image);
            console.log(currentDate,filename);
            const rootElement = await DOM.getDocument();
            const { root: { nodeId } } = rootElement;
            const { nodeIds: linkIDs } = await DOM.querySelectorAll({
                selector: "iframe",
                nodeId,
            });
            const attributes = await Promise.all(linkIDs.map((ID) =>
                DOM.getAttributes({ nodeId: ID })
            ));
            // Atrributes are returned in single array and item pairs
            const urls = attributes
                .map(x => x.attributes)
                .filter(x => x.includes("ng-src"))
                .map((attrs) => {
                    const index = attrs.indexOf("ng-src");
                    return attrs[index + 1];
                });
            console.log(urls);
            await client.close();
        }
    } catch (err) {
        console.error(err);
    }
}

process(['http://google.com',
    "http://www.carlrocks.com",
    "https://public.tableau.com/views/EAY/Storyboard",
    "https://public.tableau.com/profile/amorrison5122#!/vizhome/taleof100_0/Dashboardat570",
         'http://example.com']);