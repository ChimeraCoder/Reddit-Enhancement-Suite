// Import the APIs we need.
var pageMod = require("page-mod");
var Request = require('request').Request;
var self = require("self"); 
var firefox = typeof(require);
var tabs = require("tabs");
var ss = require("simple-storage");
// var workers = new Array();

function detachWorker(worker, workerArray) {
	var index = workerArray.indexOf(worker);
	if(index != -1) {
		workerArray.splice(index, 1);
	}
}
var localStorage = ss.storage;

localStorage.getItem = function(key) {
	return ss.storage[key];
}
localStorage.setItem = function(key, value) {
	ss.storage[key] = value;
}
localStorage.removeItem = function(key) {
	delete ss.storage[key];
}



pageMod.PageMod({
  include: ["*.reddit.com"],
  contentScriptWhen: 'ready',
  // contentScriptFile: [self.data.url('jquery-1.6.4.min.js'), self.data.url('reddit_enhancement_suite.user.js')],
  contentScriptFile: [self.data.url('jquery-1.6.4.min.js'), self.data.url('reddit_enhancement_suite.user.js')],
  onAttach: function(worker) {
	// when a tab is activated, repopulate localStorage so that changes propagate across tabs...
	tabs.on('activate', function(tab) {
		worker.postMessage({ name: "getLocalStorage", message: localStorage });
	});

    /*
	workers.push(worker);
	worker.on('detach', function () {
		detachWorker(this, workers);
		// console.log('worker detached, total now: ' + workers.length);
    });
	*/
	// console.log('total workers: ' + workers.length);
	// worker.postMessage('init');
	worker.on('message', function(data) {
		var request = data;
		switch(request.requestType) {
			case 'GM_xmlhttpRequest':
				var responseObj = {
					XHRID: request.XHRID,
					name: request.requestType
				}
				if (request.method == 'POST') {
					Request({
						url: request.url,
						onComplete: function(response) {
							responseObj.response = {
								responseText: response.text,
								status: response.status
							}
							worker.postMessage(responseObj);
						},
						headers: request.headers,
						content: request.data
					}).post();
				} else {
					Request({
						url: request.url,
						onComplete: function(response) {
							responseObj.response = {
								responseText: response.text,
								status: response.status
							}
							worker.postMessage(responseObj);
						},
						headers: request.headers,
						content: request.data
					}).get();
				}
				
				break;
			case 'singleClick':
				var button = ((request.button == 1) || (request.ctrl == 1));
				// handle requests from singleClick module
				if (request.openOrder == 'commentsfirst') {
					// only open a second tab if the link is different...
					if (request.linkURL != request.commentsURL) {
						tabs.open({url: request.commentsURL, inBackground: button });
					}
					tabs.open({url: request.linkURL, inBackground: button });
				} else {
					tabs.open({url: request.linkURL, inBackground: button });
					// only open a second tab if the link is different...
					if (request.linkURL != request.commentsURL) {
						tabs.open({url: request.commentsURL, inBackground: button });
					}
				}
				worker.postMessage({status: "success"});
				break;
			case 'keyboardNav':
				var button = (request.button == 1);
				// handle requests from keyboardNav module
				thisLinkURL = request.linkURL;
				if (thisLinkURL.toLowerCase().substring(0,4) != 'http') {
					(thisLinkURL.substring(0,1) == '/') ? thisLinkURL = 'http://www.reddit.com' + thisLinkURL : thisLinkURL = location.href + thisLinkURL;
					
				}
				// Get the selected tab so we can get the index of it.  This allows us to open our new tab as the "next" tab.
				tabs.open({url: thisLinkURL, inBackground: button });
				worker.postMessage({status: "success"});
				break;
			case 'openLinkInNewTab':
				var focus = (request.focus == true);
				thisLinkURL = request.linkURL;
				if (thisLinkURL.toLowerCase().substring(0,4) != 'http') {
					(thisLinkURL.substring(0,1) == '/') ? thisLinkURL = 'http://www.reddit.com' + thisLinkURL : thisLinkURL = location.href + thisLinkURL;
					
				}
				// Get the selected tab so we can get the index of it.  This allows us to open our new tab as the "next" tab.
				tabs.open({url: thisLinkURL, inBackground: !focus });
				worker.postMessage({status: "success"});
				break;
			case 'loadTweet':
				Request({
					url: request.url,
					onComplete: function(response) {
						var resp = JSON.parse(response.text);
						var responseObj = {
							name: 'loadTweet',
							response: resp
						}
						worker.postMessage(responseObj);
					},
					headers: request.headers,
					content: request.data
				}).get();
				break;
			case 'getLocalStorage':
				worker.postMessage({ name: 'getLocalStorage', message: localStorage });
				break;
			case 'saveLocalStorage':
				for (var key in request.data) {
					localStorage.setItem(key,request.data[key]);
				}
				localStorage.setItem('importedFromForeground',true);
				worker.postMessage({ name: 'saveLocalStorage', message: localStorage });
				break;
			case 'localStorage':
				switch (request.operation) {
					case 'getItem':
						worker.postMessage({status: true, value: localStorage.getItem(request.itemName)});
						break;
					case 'removeItem':
						localStorage.removeItem(request.itemName);
						// worker.postMessage({status: true, value: null});
						break;
					case 'setItem':
						localStorage.setItem(request.itemName, request.itemValue);
						// worker.postMessage({status: true, value: null});
						// console.log('set item called for: ' + request.itemName + ' - ' + new Date().getTime());
						/*
						for each (var thisWorker in workers) {
							if (thisWorker != worker) {
								thisWorker.postMessage({ name: "localStorage", itemName: request.itemName, itemValue: request.itemValue });
							} 
						}
						*/
						break;
				}
				break;
			default:
				worker.postMessage({status: "unrecognized request type"});
				break;
		}


	});
  }
});


