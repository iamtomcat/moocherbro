#!/usr/bin/env node
'use strict';

//Set to true if you want to save the html from the moocherpro site.
var USE_HTML = false;

var fs                           = require('fs'),
    url                          = require('url'),
    sys                          = require('sys'),
    request                      = require('request'),
    async                        = require('async'),
    path                         = require('path'),
    _                            = require('lodash-node'),
    htmlParser                   = require('htmlparser2'),
    FB                           = require('fb');

var urls = [],
    feedlink = false,
    claimed = false,
    count = 0,
    access_token = '';

var parser = new htmlParser.Parser({
  onopentag: htmlHandler,
  ontext: handleText,
  onclosetag: closeTag
});

function handleURL (_url, callback) {
  var find = '&amp;';
  var re = new RegExp(find, 'g');
  _url = _url.replace(re,'&');

   var options = {
    url: url.parse(_url,true),
    headers: {
      'Host': 'app.potfarmmoocherpro.com',
      'Origin': 'http://potfarmmoocherpro.com',
      'Referer': 'http://potfarmmoocherpro.com/list',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/35.0.1916.153 Safari/537.36'
    }
  };

  function handleResponse (error, response, body) {
    if (error) {
      console.log(error) // Print the google web page.
    } else if (!error && response.statusCode == 200) {
      parser.write(body);
      parser.end();
      if (claimed===true) {
        callback('Already Claimed');
      } else {
        callback(null);
      }
      //console.log(body); // Print the google web page.
    }
  }
  //console.log('url',_url);
  request.get(options, handleResponse);
}

function callLinks () {
  async.eachSeries(urls, handleURL , function (error) {
    if (error) {
      console.log('error',error);
    } else {
      console.log('done');
    }
  });
}

function htmlHandler (name, attribs) {
  if (name === 'div' && attribs.class === 'feedLink') {
    feedlink = true;
  } else if (name === 'meta' && attribs.name === 'response') {
    var temp = JSON.parse(attribs.content);
    if (temp.message === "Oops! You claimed this already") {
      claimed = true;
    } else {
      count++;
      console.log(count+' '+temp.message);
    }
  }
}

function handleText (text) {
  if (feedlink) {
    urls.push(text);
  }
}

function closeTag (name) {
  if (name === 'div' && feedlink) {
    feedlink = false;
  }
}

function processHtml (error, html) {
  if (error) {
    console.log('Error reading in file');
  } else {
    parser.write(html);
    parser.end();
    callLinks();
  }
}

function processJson (error, response, body) {
  //fs.writeFileSync(path.join(__dirname,'./output.json'),body);
  var temp = JSON.parse(body);

  if (temp.error) {
    console.log(temp.error.message);
  } else {
    var data = temp.data,
      length = data.length;

  for (var i = 0; i < length; i++) {
    if (!_.isUndefined(data[i].link)) {
      //console.log(data[i].link);
      var removeFBURL = data[i].link.replace('http://apps.facebook.com/mypotfarm/claimRallyReward.php','');
      var urlBase = ['http://app.potfarmmoocherpro.com/potfarm/service/actionCompanion.php'];
      urlBase.push(removeFBURL);
      urlBase.push('&r=claimRallyReward&p=web&a=');
      urlBase.push(access_token);
      urlBase.push('&os=ios&m=&v=0.0.2')
      urls.push(urlBase.join(''));
    }
  };
  callLinks();
  }  
}

function handleInfo (error, infoJson) {
  var json = JSON.parse(infoJson),
  limit = json.limit,
  rallyid = json.rallyid;
  access_token = json.access_token;

  request.get('https://graph.facebook.com/'+rallyid+'/feed?access_token='+access_token+'&limit='+limit+'&method=get&pretty=0&sdk=joey', processJson);

}

if (USE_HTML) {
  fs.readFile(__dirname+'/moocher.html', processHtml);
} else {
  fs.readFile(__dirname+'/info.json',handleInfo)
}
