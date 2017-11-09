const CDP = require('chrome-remote-interface');
const fsPath = require('fs-path');

CDP({
    host: 'localhost',
    port: 9222,
}, async client => {
    const {Page, DOM, Input} = client;

    await Page.enable();
    console.log('The Automation Parser is hacking the aws-tabint')

    // 1. keep scrolling down till all the views are shown on the webpage
    await Input.synthesizeScrollGesture({
        x: 500, 
        y: 500, 
        yDistance: -15000, 
        speed: -15000, 
        repeatCount: 5, 
        repeatDelayMs: 2000});

    // 2. Parse the DOM 
    const rootElement = await DOM.getDocument();
    const { root: { nodeId } } = rootElement;
    const { nodeIds: linkIDs } = await DOM.querySelectorAll({
        selector: ".workbook-title > a",
        nodeId,
    });

    // Get each element attributes
    const attributes = await Promise.all(linkIDs.map((ID) =>
        DOM.getAttributes({ nodeId: ID })
    ));

    // Atrributes are returned in single array and item pairs
    const links = attributes
        .map(x => x.attributes)
        .filter(x => x.includes("href"))
        .map((attrs) => {
            const index = attrs.indexOf("href");
            return attrs[index + 1];
        });

    // Use set to get unique items only
    const uniqueLinks = new Set([...links]);
    console.log(links);
    var objToWrite = { urls:links.map(e=>{
        return "https://public-aws-poc.dev.tabint.net/profile/qa.tableau"+e
    }) };
    fsPath.writeFile('./profile-urls.json', JSON.stringify(objToWrite,null,2), function (err){
        if(err) throw err;
    })
    await client.close();
});
