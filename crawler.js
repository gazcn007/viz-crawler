const fs = require('fs');
const CDP = require('chrome-remote-interface');
const ChromePool = require('chrome-pool');
const fsPath = require('fs-path');
const Promise = require('bluebird');
const exec = Promise.promisify(require('child_process').exec);
var fileIndex = [];

CDP({
    host: 'localhost',
    port: 9222,
}, async client => {
    fs.exists('./bootstrap/index.json', (fileExists)=>{
        if(fileExists){
            fs.readFile('./bootstrap/index.json', (error, data)=>{
                fileIndex = JSON.parse(data);
                console.log(fileIndex)
            });
        } else {
            fsPath.writeFile('./bootstrap/index.json', JSON.stringify(fileIndex), (err)=>{
                if(err) throw err;
            });
        }
    });
    fs.readFile("./profile-urls.json", "utf8", async (err, fileData)=>{
        const responseReceived = [];
        var { urls } = JSON.parse(fileData);
        var requestIdForBootstrap, method, bootstrapUrl, requestId, currentUrl;
        let wait = ms => new Promise(resolve => setTimeout(resolve, ms));
        const { Page, Target, Network, DOM } = client;
        Network.requestWillBeSent(params => {
            if(params.request.method=='POST'
                &&params.request.url.includes('bootstrapSession')
                &&!params.request.url.includes('errors')){
                method = params.request.method,
                bootstrapUrl = params.request.url,
                requestId = params.requestId
                requestIdForBootstrap = params.requestId;
            }
        })
        Network.loadingFinished(async ({requestId})=>{
            if(requestId==requestIdForBootstrap){
                console.log('going for',requestId);
                fileIndex.push({
                    currentUrl,
                    requestId
                });
                Network.getResponseBody({requestId}, (base64Encoded, body, error)=>{
                    if(error){
                        console.log(error);
                    }
                    fsPath.writeFile('./bootstrap/'+requestId+'.json', JSON.stringify({
                        requestId,
                        method,
                        bootstrapUrl,
                        currentUrl,
                        body
                    }),function (err){
                        if(err) throw err;
                        console.log('Parsing finished for '+requestId+'; File created in the local directory!')
                        return;
                    });  
                });  
            }
        })
        await Network.enable();
        await Page.enable();
        // var url_index_mapping = [];
        var index = 1;
        for ( url of urls){
            if(Math.random()<0.1){
                // url_index_mapping.push({index, url});
                await Page.navigate({url});
                currentUrl=url;
                // await Page.navigate({url:'https://public.tableau.com/en-us/s/gallery/sustainable-development-goals?gallery=votd'});
                await Page.loadEventFired();
                await wait(5000);
                index++;
            }
            if(index==50){
                break;
            }
        }
        await client.close();
        fsPath.writeFile('./bootstrap/index.json', JSON.stringify(fileIndex), (err)=>{
            if(err) throw err;
        });
        return;
    });
});

// -------------------------------------ERROR HANDLER---------------------------------//
//do something when app is closing
process.on('exit', exitHandler.bind(null,{cleanup:true}));
//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit:true}));
// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, {exit:true}));
process.on('SIGUSR2', exitHandler.bind(null, {exit:true}));
//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));
function exitHandler(options, err) {
    if (options.cleanup) console.log('clean');
    if (err) console.log(err.stack);
    fsPath.writeFile('./bootstrap/index.json', JSON.stringify(fileIndex), (err)=>{
        if(err) throw err;
        console.log(fileIndex);
        if (options.exit) process.exit();
    });
}

