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
    fs.readFile('./bootstrap/index.json', (error, data)=>{
      if (error) {
        fsPath.writeFileSync('./bootstrap/index.json', JSON.stringify(fileIndex));
      } else {
        fileIndex = JSON.parse(data);
      }

      fs.readFile("./profile-urls.json", "utf8", async (err, fileData)=>{
          const requestWillBeSent = [], responseReceived = [];
          var { urls } = JSON.parse(fileData);
          var requestIdForBootstrap, method, bootstrapUrl, requestId, currentUrl;
          let wait = ms => new Promise(resolve => setTimeout(resolve, ms));
          const { Page, Target, Network, DOM } = client;
          var finished = false;
          Network.requestWillBeSent(params => {
              requestWillBeSent.push(params.requestId);

              if (params.request.method === 'POST' &&
                  params.request.url.includes('bootstrapSession') &&
                 !params.request.url.includes('errors')) {
                  method = params.request.method,
                  bootstrapUrl = params.request.url,
                  requestId = params.requestId
                  requestIdForBootstrap = params.requestId;
                  console.log('Find BoostrapUrl for ',requestId,':', bootstrapUrl);
              }
          });

          Network.loadingFinished(({requestId})=>{
              responseReceived.push(requestId);
              if(requestId === requestIdForBootstrap){
                  console.log('going for',requestId);
                  fileIndex.push({
                      currentUrl,
                      requestId
                  });
                  Network.getResponseBody({requestId}, (base64Encoded, body, error)=>{
                      if(error){
                          throw error;
                      }
                      fsPath.writeFile('./bootstrap/'+requestId+'.json', JSON.stringify({
                          requestId,
                          method,
                          bootstrapUrl,
                          currentUrl,
                          body
                      }),function (err){
                          if(err) throw err;
                          console.log('Parsing finished for '+requestId+'; File created in the local directory!');
                          finished = true;
                      });
                  });
              }
          })
          await Network.enable();
          await Page.enable();
          console.log(urls.length);
          for (let url of urls) {
            finished = false;
            console.log("Start query: ", url);
            await Page.navigate({url:url});
            await Page.loadEventFired();
            while (requestWillBeSent.length > responseReceived.length && !finished) {
              await wait(1000);
            }
          }
          await client.close();
          fsPath.writeFile('./bootstrap/index.json', JSON.stringify(fileIndex), (err)=>{
              if(err) throw err;
          });
          return;
      });
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
