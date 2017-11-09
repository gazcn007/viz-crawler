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

// async function readConfig(){
//     if(process.argv[2]=='-c' || process.argv[2]=='--config'){
//         if(process.argv[3]&&process.argv[3].split('.').pop()=='json'){
//             console.log(process.argv[3]);
//             fs.readFile(process.argv[3],'utf8', (err,data)=>{
//                 if(err) {throw err};
//                 config = JSON.parse(data);
//                 console.log(data);
//             })
//         }
//     }
// }

CDP({
    host: 'localhost',
    port: 9222,
}, async client => {
    fs.readFile("./viz-urls.json", "utf8", async (err, fileData)=>{
        var { urls } = JSON.parse(fileData);
        var fullList = [].concat.apply([], urls).map(e=>{
            return config.domainURL+e;
        });
        let wait = ms => new Promise(resolve => setTimeout(resolve, ms));
        const { Page, Target, Network, DOM } = client;
        await Page.enable();
        // var url_index_mapping = [];
        var index = 1;
        for ( url of fullList){
            if(Math.random()<0.1){
                // url_index_mapping.push({index, url});
                await Page.navigate({url});
                // await Page.navigate({url:'https://public-aws-poc.dev.tabint.net//views/MSVizV24-6-2014/MSVizV2?%3Aembed=y&%3AshowVizHome=no&%3Adisplay_count=y&%3Adisplay_static_image=y&%3AbootstrapWhenNotified=true'});
                await wait(3000);
                let {data} = await Page.captureScreenshot({
                    format: 'png',
                });
                fs.writeFile('screenshot.png', data, 'base64', e => console.error(e));
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
            }
        }
        await client.close();

        // fsPath.writeFile('./goad-results/goad-results.json', 
        //     JSON.stringify({url_index_mapping,
        //         numberOfRequests: config.numberOfRequests,
        //         concurrency: config.numberOfConcurrency,
        //         datetime: getDate()
        //     }),(err)=>{
        //         if(err) throw err;
        //     });
    });
});

// async function runTest(){
//     // await readConfig();
//     await batchProcess();
// }

// var getDate = ()=>{
//     var time = new Date();
//     return (time.getHours() + ":" + time.getMinutes() + ":" + time.getSeconds());
// }
// runTest();