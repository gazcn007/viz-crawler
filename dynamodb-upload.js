const fsPath = require('fs-path');
const fs = require('fs');
const AWS = require('aws-sdk');
AWS.config.update({region: 'us-west-1'});

ddb = new AWS.DynamoDB({apiVersion: '2012-10-08'});

var params = {
    AttributeDefinitions: [
        {
            AttributeName: 'Id',
            AttributeType: 'N'
        }
    ],
    KeySchema: [
        {
            AttributeName:'Id',
            KeyType: 'HASH'
        }
    ],
    ProvisionedThroughput: {
        ReadCapacityUnits: 1,
        WriteCapacityUnits: 1
    },
    TableName: 'Viz-Crawl'
};

/*
{
            AttributeName: 'PublicUrl',
            AttributeType: 'S'
        },{
            AttributeName: 'RequestId',
            AttributeType: 'S'
        },{
            AttributeName: 'Method',
            AttributeType: 'S'
        },{
            AttributeName: 'BootstrapUrl',
            AttributeType: 'S'
        },{
            AttributeName: 'Body',
            AttributeType: 'S'
        }
*/

// ddb.createTable(params, function(err, data){
//     if(err){
//         console.log("Error", err);
//     } else {
//         console.log("Success", data.Table.KeySchema)
//     }
// })

fs.readFile("./bootstrap/index.json", "utf8", async (err, fileData) => {
    var fileIndex = JSON.parse(fileData);
    for (file of fileIndex) {
        fs.readFile("./bootstrap/"+file.requestId+".json", "utf8", async (err, data) => {
            console.log(data);
            var request = JSON.parse(data);
            let params = {
                Item: {
                    "Id": {
                        N: request.requestId
                    },
                    "PublicUrl": {
                        S: file.currentUrl
                    },
                    "RequestId": {
                        S: request.requestId
                    },
                    "Method":{
                        S: request.method
                    },
                    "BootstrapUrl":{
                        S: request.bootstrapUrl
                    },
                    "Body":{
                        S: JSON.stringify(request.body)
                    }
                },
                TableName: 'Viz-Crawl'
            }
            ddb.putItem(params, function(err, data) {
               if (err) console.log(err, err.stack); // an error occurred
               else     console.log(data);           // successful response
               /*
               data = {
                ConsumedCapacity: {
                 CapacityUnits: 1, 
                 TableName: "Music"
                }
               }
               */
             });
        })
    }
})
