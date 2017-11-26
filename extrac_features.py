import numpy as np
import matplotlib.pyplot as plt
import json
from datetime import datetime;
import nltk;
from nltk import word_tokenize;
import re;
failed_json = [];

meta = []
with open('./metaData.json') as f:
    meta = json.load(f)
temp = {}
for entry in meta:
    temp[entry[2].replace('/', '')[0:100]+'.json'] = [entry[0], entry[1]]
meta = temp

data_size = [];
word_tokens = [];
y = [];
batch = 0;

np.random.seed(598374);
start = datetime.now();
finished = 0;
with open('./bootstrap/index.json') as json_data:
    file_names = np.array(json.load(json_data))
    print(len(file_names))
    file_names = file_names[np.random.randint(0, len(file_names), size=len(file_names))]
    for file_name in file_names:
        print(file_name)
        try:
            if (file_name not in failed_json and file_name.endswith('.json')):
                with open('./bootstrap/' + file_name) as text_data:
                    text = json.load(text_data);
                    if (len(text) == 3):
                        raw_text = [];
                        def walk(node):
                            if isinstance(node, dict):
                                for (key, item) in node.items():
                                    walk(item)
                            elif isinstance(node, list):
                                for element in node:
                                    walk(element)
                            else:
                                raw_text.append(node)
                        walk(text[0:1]);
                        raw_text = json.dumps(raw_text, ensure_ascii=False);
                        if (abs(len(raw_text) - len(raw_text.encode())) < 100):
                            raw_text = re.sub(r'style=\\\"[^\'"]*\\\"', "", raw_text);
                            raw_text = re.sub(r'align-(right|center|left|bottom)', "", raw_text);
        #                     print(raw_text)
                            raw_text = re.sub(r"http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\(\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+", "URL", raw_text);
                            raw_text = re.sub(r"[:;/='\.]", " ", raw_text);
                            raw_text = re.sub(r"rgb", "", raw_text);
                            raw_text = re.sub(r"<[\s]?span", "", raw_text);
                            raw_text = re.sub(r"<[\s]?br", " ", raw_text);
                            raw_text = re.sub(r"div", "", raw_text);
                            raw_text = re.sub(r"[\<\>]", "", raw_text);
                            raw_text = re.sub(r"_", " ", raw_text);

                            raw_text = re.sub(r"[\(\)]", " ", raw_text);
                            raw_text = re.sub(r"-", " ", raw_text);

                            raw_text = re.sub(r"[\s]+", " ", raw_text);
                            raw_text = re.sub(r"\\n", " ", raw_text);
                            tokens = re.findall("[0-9a-zA-Z\-!$%^&*_+|~=`;\’\'\@\#?,\s.\/]+", raw_text);
                            tokens = filter(lambda x: (re.search('[a-zA-Z]{3,}', x) != None), tokens);
        #                     print(list(tokens))
                            def averageLen(x):
                                if re.search('\s', x) != None:
                                    return (20 + x.count(' ') * 20 > len(x))
                                elif len(x) <= 20: return True;
                                else: return False;
                            tokens = set(filter(averageLen, tokens));
        #                     print(tokens)
                            tokens = word_tokenize(' '.join(tokens));
                            tokens = list(filter(lambda x: (re.search('[a-zA-Z]{3,}|^[0-9]{4}$', x) != None), tokens));
                            keys_to_ignore = ['true', 'false', 'fontsize', 'run'];
                            tokens = [x for x in tokens if x not in keys_to_ignore];
    #                         print(tokens)
                            
                            temp = []
                            for c, word in enumerate(tokens):
                                if (word not in keys_to_ignore):
                                    words = re.findall('[A-Z0-9]+[^A-Z0-9]+', word)
                                    if words == []: words = [word]
                                    for subword in words:
                                        if (len(subword) > 2 and len(subword) < 20 and (re.search('\d', subword) == None)):
                                            temp.append(subword)
#                             print('here')
                            tokens = temp;
                            filemeta = meta.get(file_name, None);
                            if (filemeta != None):
                                tokens.append(filemeta[0]);
                                tokens.append(filemeta[1]);
                            else:
                                tokens.append('-1', '');
                            word_tokens.append(' '.join(tokens));
                            y.append(text[2]);
                            data_size.append(len(json.dumps(text[0].get('worldUpdate', {}).get('applicationPresModel', {}).get('workbookPresModel', {}).get('dashboardPresModel', {}).get('zones', {}))));

                            finished += 1;
                            if (finished // 1000 > batch):
                                with open('./trainX.csv', 'a') as output:
                                    output.write('\n' + '\n'.join(word_tokens));
                                    word_tokens = [];
                                with open('./trainY.csv', 'a') as output:
                                    output.write('\n' + '\n'.join(str(v) for v in y));
                                    y = [];
                                with open('./trainDS.csv', 'a') as output:
                                    output.write('\n' + '\n'.join(str(v) for v in data_size));
                                    data_size = [];
                            print(finished);
                    else:
                        failed_json.append(file_name)
                        print(text, file_name);
        except:
            continue;
end = datetime.now();
print(end - start);
