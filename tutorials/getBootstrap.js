const fs = require('fs');

const CDP = require('chrome-remote-interface');
let wait = ms => new Promise(resolve => setTimeout(resolve, ms));

function loadByTab(url){
    return new Promise(async(resolve, reject)=>{

        let requestReceived = [];
        let taskFailed = 0;
        let ridForBootstrap;
        let result;
        const tab = await CDP.New();
        await CDP.Activate({id: tab.id});
        const client = await CDP({tab});
        const {Page, Network} = client;
        await Promise.all([Network.enable(),Page.enable()]);
        Network.requestWillBeSent(params => {
            if (params.request.method === 'POST' &&
                params.request.url.includes('bootstrapSession') &&
               !params.request.url.includes('errors') ) {
                ridForBootstrap = params.requestId;
            }
        });

        let task = new Promise((resolve, reject)=>{
            let timeout = setTimeout(()=>{
                taskFailed++;
                resolve(true);
            }, 10000);
            Network.loadingFinished(({requestId})=>{
                requestReceived.push(requestId);
                if(requestId=== ridForBootstrap){
                    clearTimeout(timeout);
                    timeout = setTimeout(()=>{
                        taskFailed++;
                        resolve(true);
                    }, 10000);
                    Network.getResponseBody({requestId}, (base64Encoded, body, error)=>{
                        if(error) throw error;
                        let data = body['body'];
                        if (data) {
                            result = data;
                            clearTimeout(timeout);
                            resolve(true);
                        }
                    });
                }
            });
        });
        await Page.navigate({url});
        await task;
        await client.close();
        resolve({client, tab, result});
    });
}

async function process(urls) {
    let results = []
    const handlers = await Promise.all(urls.map(loadByTab));
    for (const {client, tab, result} of handlers){
        results.push(result);
        await CDP.Close({id: tab.id});
    }

    console.log("Result length : ", results.length);
}

process(['http://google.com',
    "http://www.carlrocks.com",
    "https://public.tableau.com/views/EAY/Storyboard",
    "https://public.tableau.com/profile/amorrison5122#!/vizhome/taleof100_0/Dashboardat570",
         'http://example.com']);