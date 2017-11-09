const fs = require('fs');
const CDP = require('chrome-remote-interface');
const ChromePool = require('chrome-pool');
const fsPath = require('fs-path');

async function process(urls){
    const chromepoll = await ChromePool.new({
        maxTab : 5,
        port : 9222
    });
    let wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    var toRet = [];
    for (url of urls){
        const { tabId,protocol } = await chromepoll.require();
        const { Page,Target,Network, DOM } = protocol;
        await Page.enable();
        await Page.navigate({url})
        await Page.loadEventFired();
        await wait(3000);
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
        const url_parsed = attributes
            .map(x => x.attributes)
            .filter(x => x.includes("ng-src"))
            .map((attrs) => {
                const index = attrs.indexOf("ng-src");
                return attrs[index + 1];
            });
        toRet.push(url_parsed);
        await chromepoll.release(tabId);
    }
    await chromepoll.destroyPoll();
    return toRet;
}


async function batchProcess(){
    fs.readFile("./profile-urls.json", "utf8", async (err, fileData)=>{
        var { urls } = JSON.parse(fileData);
        var fullList = [];
        for (let i = 0; i<urls.length; i=i+5){
            console.log('Batch Processing :', i,' to ',i+5);
            var res = await process(urls.slice(i,i+5));
            console.log("finished : ", res);
            fullList.push(res);
        }
        fsPath.writeFile('./viz-urls.json', JSON.stringify({urls: fullList},null,2), function (err){
            if(err) throw err;
            console.log('Parsing finished; file created in the local directory!')
            return;
        })
    });
}
batchProcess();