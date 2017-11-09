const fs = require('fs');
const CDP = require('chrome-remote-interface');
const ChromePool = require('chrome-pool');
const fsPath = require('fs-path');
const Promise = require('bluebird');
const exec = Promise.promisify(require('child_process').exec);

// Default configuration
var config = {
    numberOfRequests: 1000,
    numberOfConcurrency: 15,
    scenerioRatios:{
        screenshot: 0.3,
        requests: 0.3,
        clicking: 0.3
    },
    numberOfPagesToTest: 10,
    domainURL: "https://public-aws-poc.dev.tabint.net"
}

CDP({
    host: 'localhost',
    port: 9222,
}, async client => {
    fs.readFile("./viz-urls.json", "utf8", async (err, fileData)=>{
        const requestsMade = []
        var { urls } = JSON.parse(fileData);
        var fullList = [].concat.apply([], urls).map(e=>{
            return config.domainURL+e;
        });
        var requestIdForBootstrap;
        let wait = ms => new Promise(resolve => setTimeout(resolve, ms));
        const { Page, Target, Network, DOM } = client;
        Network.requestWillBeSent(params => {
            if(params.request.method=='POST'
                &&params.request.url.includes('bootstrapSession')
                &&!params.request.url.includes('errors')){
                requestsMade.push(params);
                console.log(params.request.method);
                console.log(params.request.url);
                console.log(params.requestId);
                requestIdForBootstrap=params.requestId;
            }
        })
        // Network.responseReceived(async ({requestId, reponse}) =>{
        //         const {body, base64Encoded} = await Network.getResponseBody({requestId});
        //     if(requestId==requestIdForBootstrap){
        //         console.log(`RES [${requestId}] body: ${body}`);
        //     }
        // });
        Network.loadingFinished(async ({requestId})=>{
            if(requestId==requestIdForBootstrap){
                const {body, base64Encoded} = await Network.getResponseBody({requestId});
                console.log(`RES [${requestId}] body: ${body} \n`);
            }
        })
        await Network.enable();
        await Page.enable();
        // var url_index_mapping = [];
        var index = 1;
        // for ( url of fullList){
        //     if(Math.random()<0.1){
                // url_index_mapping.push({index, url});
                // await Page.navigate({url});
                await Page.navigate({url:'https://public-aws-poc.dev.tabint.net//views/MSVizV24-6-2014/MSVizV2?%3Aembed=y&%3AshowVizHome=no&%3Adisplay_count=y&%3Adisplay_static_image=y&%3AbootstrapWhenNotified=true'});
                await Page.loadEventFired();
                await wait(3000);
                
                // const rootElement = await DOM.getDocument();
                // const { root: { nodeId }} =rootElement;
                // var { nodeIds: linkIDs } = await DOM.querySelectorAll({
                //     selector:'span',
                //     nodeId
                // })
                // const attributes = await Promise.all(linkIDs.map((ID) =>
                //     DOM.getAttributes({ nodeId: ID })
                // ));
                // // console.log(test);
                // if(index == config.numberOfPagesToTest) break;
                // index++;
        //     }
        // }
        await client.close();

    });
});



