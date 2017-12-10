const fs = require('fs');

function filter(str) {
  let charTest = str.match(/[a-zA-Z]+/) && str.match(/[a-zA-Z]+/)[0].length >= 2;
  let lenTest = str.length <= 20 + (str.match(/\s/g) || []).length * 20;
  return charTest && lenTest;
}


let file = './file.json';
	fs.readFile(file, 'utf-8', (error, data) => {
		var obj = JSON.parse(data);
		console.log(Object.keys(obj).length);
		data = data.replace(/[http|https]:\/\//g, 'URL');
		data = data.replace(/\<*.\>/g, 'LRBRAKET');
		data = data.replace(/:/g, 'SEMIC');
		let arrayCleaner = /"[0-9a-zA-Z\-!$%^&*()_+|~=`;\’'\@\#?,\s.\/]+?"/g;
		let match;
		let wordsBag = new Set();
		while((match = arrayCleaner.exec(data)) != null) {
		  if (filter(match[0])){
		    wordsBag.add(match[0])
		  }
		}
	fs.writeFileSync('./trimmed.json', Array.from(wordsBag));
});
