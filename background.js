chrome.extension.onConnect.addListener(function(port,name) {
   port.onMessage.addListener(function(info,con){
      con.postMessage({
            "search":localStorage["search"],
            "hitahint":localStorage["hitahint"],
            "other":localStorage["other"],
            "hitahintkeys": localStorage["hitahintkeys"],
            "sites":localStorage["disabled_sites"],
      });
  });
});
