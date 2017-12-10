const fs = require('fs');
const fsPath = require('fs-path');
const CDP = require('chrome-remote-interface');
let wait = ms => new Promise(resolve => setTimeout(resolve, ms));


function findStrings(node){
    let keywords = [];
    if(node instanceof Array){
        for ( element of node ) {
            keywords = keywords.concat(findStrings(element));
        }
    } else if (node instanceof Object){
        if(node.dataType != undefined){
            if(node['dataType'] == "cstring" && node['dataValues'] != undefined){
                keywords = keywords.concat(node.dataValues.filter(e=>{return !/^\d*.?\d+$/.test(e)}));
            }
        } else if (node['name'] != undefined){
            keywords = keywords.concat(node.name);
        } else if (node['caption'] != undefined){
            keywords = keywords.concat(node.caption);
        } else {
            for ( index in node ) {
                keywords = keywords.concat(findStrings(node[index]));
            }
        }
    } 
    return keywords;
}

function filter(data){
    let regx = /\}[0-9]+\;\{/g;
    let match;
    let seperator = '@$#7842@&#';
    while ((match = regx.exec(data)) != null) {
      data = data.slice(0, match.index+1) + seperator + data.slice(match.index+1);
    }

    let dataToTrim = data.split(seperator);
    let usefulData = [];
    for(let p = 0; p < dataToTrim.length; p++) {
      let d = dataToTrim[p];
      let dataId = d.slice(0, d.indexOf(';{'));

      try {
        d = JSON.parse(d.slice(d.indexOf(';{') + 1));
        usefulData.push(d);
      } catch(e) {
        throw err;
      }
    }
    console.log(JSON.stringify(usefulData));
    let toRet;
    console.log(toRet = findStrings(usefulData));
    return toRet;
}

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
        client.setMaxListeners(2000);
        let timeout;
        let task = new Promise(async (outerResolve, outerReject)=>{
            let flag = false;
            let innerTask = new Promise((resolve, reject)=>{
                timeout = setTimeout(()=>{
                    taskFailed++;
                    console.log("First Failure on ", url);
                    resolve(false);
                }, 60000);
                Network.requestWillBeSent(params => {
                    if(params.request.method === 'POST' &&
                        params.request.url.includes('bootstrapSession') &&
                        !params.request.url.includes('errors') &&
                        !flag){
                        clearTimeout(timeout);
                        ridForBootstrap = params.requestId;
                        resolve(true);
                    }
                });
            }).then((hasBootstrapId)=>{
                if(!hasBootstrapId){
                    outerResolve(false);
                }
                timeout = setTimeout(()=>{
                    taskFailed++;
                    console.log("Second Failure on ", url);
                    outerResolve(false);
                },60000);
                Network.loadingFinished(({requestId})=>{
                    if(requestId === ridForBootstrap){
                        clearTimeout(timeout);
                        timeout = setTimeout(()=>{
                            taskFailed++;
                            console.log("Third Failure on : ", url);
                            outerResolve(false);
                        }, 60000);
                        Network.getResponseBody({requestId},(base64Encoded, body, error)=>{
                            if(error) throw error; // todo connect with outer promsie
                            clearTimeout(timeout);
                            if(body){
                                let data = body['body'];
                                if(data){
                                    result = filter(data);
                                    outerResolve(true);
                                }
                            }
                        })
                    }
                })
            })
        })
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
    fsPath.writeFileSync('./index.json', JSON.stringify(results));
}

process([
    // "https://public.tableau.com/views/ItalianWolf/Story1?:embed=y&:showVizHome=no&:host_url=https%3A%2F%2Fpublic.tableau.com%2F&:embed_code_version=3&:tabs=no&:toolbar=yes&:animate_transition=yes&:display_static_image=no&:display_spinner=no&:display_overlay=yes&:display_count=yes&:loadOrderID=0",
    "https://public.tableau.com/views/2012OlympicsMens10MPlatform_0/Dashboard1",])
    // "https://public.tableau.com/views/taleof100_0/Dashboardat570?%3Aembed=y&%3AshowVizHome=no&%3Adisplay_count=y&%3Adisplay_static_image=y&%3AbootstrapWhenNotified=true"]);