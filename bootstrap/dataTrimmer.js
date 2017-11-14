const fs = require('fs');

function filter(str) {
  let charTest = str.match(/[a-zA-Z]+/) && str.match(/[a-zA-Z]+/)[0].length >= 2;
  return charTest;
}
fs.readFile('./index.json', 'utf-8', (error, data) => {
  if (error) {
    console.log('[ERROR] Needs index.json to start.');
  } else{
    let index = JSON.parse(data);
    for (let id of index) {
      let file = './'+id+'.json';
      fs.readFile(file, 'utf-8', (error, data) => {
        data = data.replace(/[http|https]:\/\//g, 'URL');
        let arrayCleaner = /"[0-9a-zA-Z\-!$%^&*()_+|~=`;'\@\#?,\s.\/]+?"/g;
        let match;
        let wordsBag = new Set();
        while((match = arrayCleaner.exec(data)) != null) {
          if (filter(match[0])){
            wordsBag.add(match[0])
          }
        }
        fs.writeFileSync('./'+id+'-t.json', Array.from(wordsBag));
      });
    }
  }
});
