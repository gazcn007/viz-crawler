const fs = require('fs');
const CDP = require('chrome-remote-interface');
const ChromePool = require('chrome-pool');
const fsPath = require('fs-path');
const Promise = require('bluebird');
const exec = Promise.promisify(require('child_process').exec);
var fileIndex = [];

async function crawler(BatchNum){
  const chromeTabsPoll = await ChromePool.new({
      maxTab : 200,
      port : 9222
  });
  var taskFailed = 0;
  fs.readFile('./bootstrap/index.json', (error, data)=>{
    if (error) {
      fsPath.writeFileSync('./bootstrap/index.json', JSON.stringify(fileIndex));
    } else {
      fileIndex = JSON.parse(data);
    }

    fs.readFile("./profile-urls.json", "utf8", async (err, fileData)=>{
        const requestWillBeSent = [], responseReceived = [];
        var { urls } = JSON.parse(fileData);

        for (let i = 0; i < urls.length;) {
          let batchNum = urls.length - i < BatchNum ? urls.length - i: BatchNum;
          let remainingRequests = [];

          for (let c = i; c < i + batchNum; c++){
            let finished = false;
            let url = urls[c];
            let ridForBootstrap;
            let { tabId, protocol } = await chromeTabsPoll.require();
            let { Page, Target, Network, DOM } = protocol;
            await Network.enable();
            await Page.enable();
            Network.requestWillBeSent(params => {
                if (params.request.method === 'POST' &&
                    params.request.url.includes('bootstrapSession') &&
                   !params.request.url.includes('errors') ) {
                    ridForBootstrap = params.requestId;
                    console.log('Find BoostrapUrl for', ridForBootstrap);
                }
            });

            let task = new Promise((resolve, reject) => {
              let timeout = setTimeout(() => {
                taskFailed++;
                console.log(url, "Failed");
                resolve(true);
              }, 10000);
                Network.loadingFinished(({requestId})=>{
                    responseReceived.push(requestId);
                    if(requestId === ridForBootstrap){
                        console.log('going for',requestId);
                        clearTimeout(timeout);
                        timeout = setTimeout(() => {
                          taskFailed++;
                          console.log(requestId, "Failed");
                          resolve(true);
                        }, 10000);
                        Network.getResponseBody({requestId}, (base64Encoded, body, error)=>{
                            if(error){
                                throw error;
                            }
                            let data = body['body'];
                            if (data) {
                              let regx = /\}[0-9]+\;\{/g;
                              let match;
                              let seperator = '@$#7842@&#';
                              while ((match = regx.exec(data)) != null) {
                                data = data.slice(0, match.index+1) + seperator + data.slice(match.index+1);
                              }
                              let dataToTrim = data.split(seperator);
                              let usefulData = {};
                              for(let p = 0; p < dataToTrim.length; p++) {
                                let d = dataToTrim[p];
                                let dataId = d.slice(0, d.indexOf(';{'));
                                fileIndex.push(dataId);
                                try {
                                  d = JSON.parse(d.slice(d.indexOf(';{') + 1));
                                  try {
                                    fsPath.writeFileSync('./bootstrap/'+dataId+'.json', JSON.stringify(d));
                                  } catch(e) {
                                    reject(e);
                                  }
                                } catch(e) {
                                  return;
                                }
                                // console.log('File created in the local directory: '+requestId+'-'+dataId);
                              }
                              clearTimeout(timeout);
                              resolve(true);
                            }
                        });

                    }
                });
            }).then(() => protocol.close());
            remainingRequests.push(task);
            console.log("Start query: ", url);
            Page.navigate({url:url});
          }
          await Promise.all(remainingRequests);
          i = i + batchNum;
        }
        await chromeTabsPoll.destroyPoll();
        console.log("Total Fail:", taskFailed);
        fsPath.writeFileSync('./bootstrap/index.json', JSON.stringify(fileIndex));
        process.exit();
    });
    return;
  });
};

 crawler(parseInt(process.argv[2]) || 10);
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
