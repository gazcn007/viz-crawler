const CDP = require('chrome-remote-interface');
const fsPath = require('fs-path');

function triggerEventOnPage(selector, eventName, document) {
        var event;
        var element = document.querySelector(selector);

        event = document.createEvent("Event");
        event.initEvent(eventName, true, true);
        event.memo = memo || { };

        element.dispatchEvent(event);
}

CDP({
    host: 'localhost',
    port: 9222,
}, async client => {
    const {Page, DOM, Input, Runtime} = client;

    await Page.enable();
    await Runtime.enable();
    console.log('The Automation Parser is hacking the aws-tabint')

    await Runtime.evaluate({
        expression: "function triggerEventOnPage(selector, eventName) {\
        var event;\
        var element = document.querySelector(selector);\
        event = document.createEvent('Event');\
        event.initEvent('click', true, true);\
        element.dispatchEvent(event);\
        }\
        triggerEventOnPage('.pager-next > a','click')"
    });

    // 3. Parse the DOM 
    const rootElement = await DOM.getDocument();

    const { root: { nodeId } } = rootElement;
    const { nodeIds: linkIDs } = await DOM.querySelectorAll({
        selector: ".media-viz__thumbnail >a",
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
    console.log(links.length);
    var objToWrite = { urls:links.map(e=>{
        return e
    }) };
    fsPath.writeFile('./profile-urls.json', JSON.stringify(objToWrite,null,2), function (err){
        if(err) throw err;
    })
    await client.close();
});
