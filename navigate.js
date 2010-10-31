// don't scroll window when user activate migemo-search
// linksearch in frames

const scrollValue = 30;
const KEY = {
   NUM1:49,NUM2:50,NUM3:51,NUM4:52,NUM5:53,NUM6:54,NUM7:55,NUM8:56,NUM9:57,
   ENTER: 13,
   LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40,
   CONTROL: 17,
   G: 71,
   J: 74, K: 75, H: 72, L: 76, ESC: 27,
   Z: 90, X: 88,
   SEMICOLON: 186,
   COMMA:188, PERIOD: 190, SLASH: 191,
};
const d = document;

var search_enable;
var hitahint_enable;
var other_enable;
var sites;
var usechars;

// load connection
var connection = chrome.extension.connect();
connection.onMessage.addListener(function(info, con){
   search_enable = info.search=="false"?false:true;
   hitahint_enable = info.hitahint=="false"?false:true;
   other_enable = info.other=="false"?false:true;
   usechars = info.hitahintkeys || "asdfjkl";
   sites = (info.sites||"").split(",").slice(0,-1);
});
connection.postMessage();

function isDisabledSite() {
   for (var i=0;i<sites.length;i++)
      if (location.href.search(new RegExp(sites[i])) >= 0)
         return true;
   return false;
}


function click(target, ctrlKey, altKey, shiftKey, metaKey){
   var objects = ["INPUT", "TEXTAREA", "SELECT"];
   if ($.inArray(target.tagName, objects) != -1) {
      target.focus();
   } else {
      var evt = document.createEvent('MouseEvents');
      evt.initMouseEvent("click", true, true, window,
                         0, 0, 0, 0, 0,
                         ctrlKey, altKey, shiftKey, metaKey, 0, null);
      target.dispatchEvent(evt);
   }
}

function isInArea(innerCR, outer) {
   var inWindow = true;
   var outerCR = {width: window.innerWidth, height: window.innerHeight};
   if(outer){
      outerCR = outer.getBoundingClientRect();
      var newInnerCR = {left: outerCR.left + innerCR.left,
                        top:  outerCR.top  + innerCR.top,
                        width: innerCR.width,
                        height: innerCR.height };
      inWindow = isInArea(newInnerCR);
   }

   var inFrame = (0 <= innerCR.left && innerCR.left <= outerCR.width &&
                  0 <= innerCR.top  && innerCR.top  <= outerCR.height);
   return inWindow && inFrame;
}

function makeCenter(node){
   var cr = node.getBoundingClientRect();
   window.scrollBy(cr.left - window.innerWidth/2,
                   cr.top - window.innerHeight/2);
}
function addClass(node, classname) {
   if (node.className == "") {
      node.className = classname;
      return true;
   } else {
      classes = node.className.split(" ");
      if (classes.indexOf(classname) == -1) {
         node.className += " "+classname;
         return true;
      } else {
         return false;
      }
   }
}
function removeClass(node, classname) {
   classes = node.className.split(" ");
   pos     = classes.indexOf(classname);
   if (pos != -1) {
      newclasses = classes.slice(0,pos).concat(classes.slice(pos+1));
      node.className = "";
      for (var i=0;i<newclasses.length;i++) {
         node.className += newclasses[i]+" ";
      }
      return true;
   }
   return false;
}

var HitAHintMode = function(){
   var self = this;

   this.candidateNodes = {};
   this.panel = $("<div id='chrome_hitahintpanel'"+
                  "style='opacity:0'></div>");
   this.input = $("<input id='chrome_hitahintinput' type='text'></input>");
   this.panel.css("display", "none");
   this.panel.append(this.input);
   $("body").append(this.panel);
   this.input.keyup(function(e){
      e.preventDefault();
      if (e.keyCode == KEY.ESC) {
         self.finish();
         return;
      }

      for (hintkey in self.candidateNodes) {
         hint = self.candidateNodes[hintkey].hint;
         if (this.value == "" || hintkey.indexOf(this.value)==0) {
            removeClass(hint, "chrome_not_candidate");
         } else {
            addClass(hint, "chrome_not_candidate");
         }
      }
      if (this.value == "" || self.candidateNodes[this.value]) {
         self.input.css("backgroundColor", "white");
      } else {
         self.input.css("backgroundColor", "red");
      }
   });
   this.input.keydown(function(e){
      if (e.keyCode == KEY.COMMA) {
         e.preventDefault();
         e.stopPropagation();
         self.finish();
         return;
      }

      if (e.keyCode == KEY.SEMICOLON && self.candidateNodes[this.value]) {
         target = self.candidateNodes[this.value].node;
         self.finish();
         target.focus();
         e.preventDefault();
         return;
      }
      if (e.keyCode == KEY.ENTER && self.candidateNodes[this.value] ) {
         target = self.candidateNodes[this.value].node;
         self.finish();
         click(target, e.ctrlKey, e.altKey, e.shiftKey, e.metaKey);
         e.preventDefault();
      }
   });

   this.hintsdiv = document.createElement("div");
   this.hintsdiv.id = "chrome_hintswindow";
   d.body.appendChild(this.hintsdiv);

   this.showHint = function(){
      const targetSelector = "a[href]:visible,input[type!=hidden]:visible,"+
                             "textarea:visible,select:visible,"+
                             "img[onclick]:visible,button:visible";

      var frames = d.querySelectorAll('iframe, frame');
      var docs = [d].concat($.map(frames,function(fs){return fs.contentDocument}));

      for (var idx=0,j=0;idx<docs.length;idx++) {
         var allNodes = $.makeArray($(targetSelector, docs[idx]));
         var frameOffset = {top:0, left:0};
         if (idx != 0) {
            frameOffset = frames[idx-1].getBoundingClientRect();
         }

         var df = d.createDocumentFragment();
         for (var i=0;i<allNodes.length;i++) {
            var node = allNodes[i];
            var cr = node.getBoundingClientRect();

            if (node.id.indexOf("chrome_")!=0 && isInArea(cr, frames[idx-1]) ){
               tag = this.num2string(j++);
               span = docs[idx].createElement("span");
               span.innerText = tag;

               var left = (window.pageXOffset+cr.left +
                           (idx?frameOffset.left-docs[idx].body.scrollLeft:0));
               var top  = (window.pageYOffset+cr.top  +
                           (idx?frameOffset.top -docs[idx].body.scrollTop :0));

               span.style.left = ""+(left-8)+"px";
               span.style.top  = ""+(top-8)+"px";
               span.className = "chrome_hint chrome_not_candidate";
               df.appendChild(span);
               this.candidateNodes[tag] = {"hint":span, "node":node};
            }
         }
         this.hintsdiv.appendChild(df);
      }
      setTimeout(function(){
         $("#chrome_hintswindow > *").removeClass("chrome_not_candidate");
      }, 0);
   };
   this.hideHint = function(){
      $("#chrome_hintswindow > *").css("opacity", "0");
      setTimeout(function(){
         $("#chrome_hintswindow").empty();
      }, 200);
   };

   this.num2string = function(num){
      n = usechars.length;
      table = "0123456789abcdefghijklmnopqrstuvwxyz".slice(0,n);
      tmp = num.toString(n);
      result = "";
      for (var i=0;i<tmp.length;i++) {
         result += usechars[table.indexOf(tmp[i])]
      }
      return result;
   };

   this.init = function(){
      this.panel.css("display", "block");
      this.panel.css("opacity", "0.9");
      this.input[0].focus();
      this.showHint();
   }
   this.finish = function(){
      mode = undefined;
      this.input[0].value = "";
      this.input[0].blur();
      document.body.focus();
      this.panel.css("opacity", "0");
      var tmp = this.panel;
      setTimeout(function(){tmp.css("display", "none")},100);
      this.hideHint();
   }
};

var LinkSearchMode = function(){
   var self = this;

   this.allNodes = [];
   this.candidateNodes = [];
   this.selectedNodeIdx = undefined;
   this.previousString = "";
   this.panel = $("<div id='chrome_linksearchpanel'"+
                  "style='opacity:0'></div>");
   this.input = $("<input id='chrome_linksearchinput' type='text'></input>")
   this.panel.css("display", "none");
   this.panel.append(this.input);
   $("body").append(this.panel);
   this.input.keyup(function(e){
      e.preventDefault();
      if (e.keyCode == KEY.ESC) {
         self.finish();
         return;
      }
      
      if (self.previousString == this.value) {
         return;
      }
      self.previousString = this.value;
      self.hideLinks();
      self.candidateNodes = [];

      regexp = new RegExp(migemo.query(this.value), "i");
      for (var i=0;i<self.allNodes.length;i++) {
         var node = self.allNodes[i];
         if (node.innerText.search(regexp) != -1) {
                self.candidateNodes.push(node);
             }
      }
      if (self.candidateNodes.length > 0) {
         self.input.css("backgroundColor", "white");
	 
         self.selectedNodeIdx = 0;
	     addClass(self.candidateNodes[0], "chrome_search_selected");
//	     makeCenter(self.candidateNodes[0]);
	     for (var i=1;i<self.candidateNodes.length;i++){
	        addClass(self.candidateNodes[i], "chrome_search_candidate");
         }
      } else {
         self.input.css("backgroundColor", "red");
         self.selectedNodeIdx = undefined;
      }
   });
   this.input.keydown(function(e){
      switch(e.keyCode) {
      case KEY.SEMICOLON:
         if (self.selectedNodeIdx == undefined) {
            return;
         }
         self.candidateNodes[self.selectedNodeIdx].focus();
         self.finish();
         e.preventDefault();
         break;
      case KEY.ENTER:
         if (self.selectedNodeIdx == undefined) {
            return;
         }
         click(self.candidateNodes[self.selectedNodeIdx],
	       e.ctrlKey, e.altKey, e.shiftKey, e.metaKey);
         self.finish();
         e.preventDefault();
         break;
      case KEY.G:
         if (e.ctrlKey) {
            e.preventDefault();
            if (self.selectedNodeIdx == undefined) {
               return;
            }

            removeClass(self.candidateNodes[self.selectedNodeIdx],
                        "chrome_search_selected");
            if (!e.shiftKey) {
               self.selectedNodeIdx += 1;
               self.selectedNodeIdx %= self.candidateNodes.length;
            } else {
               self.selectedNodeIdx -= 1;
               self.selectedNodeIdx += self.candidateNodes.length;
               self.selectedNodeIdx %= self.candidateNodes.length;
            }
            new_target = self.candidateNodes[self.selectedNodeIdx];
            addClass(new_target, "chrome_search_selected");
            if ( !isInWindow(new_target.getBoundingClientRect()) ) {
               makeCenter(new_target);
            }
         }
         break;
      }
   });

   this.hideLinks = function(){
      self.selectedNodeIdx = undefined;
      self.input.css("backgroundColor", "white");
      $(".chrome_search_candidate").removeClass("chrome_search_candidate");
      $(".chrome_search_selected").removeClass("chrome_search_selected");
   };

   this.init = function(){
      this.panel.css("display", "block");
      this.panel.css("opacity", "0.9");
      this.input[0].focus();

      const targetSelector = "a[href]:visible";
      this.allNodes = $.makeArray($(targetSelector));
      for (var i=0,frames=d.querySelectorAll("iframe"),len=frames.length;i<len;i++) {
         this.allNodes = this.allNodes.concat($.makeArray($(targetSelector,
                                                            frames[i].contentDocument)));
      }
   };
   this.finish = function(){
      mode = undefined;
      this.input[0].value = "";
      this.input[0].blur();
      this.panel.css("opacity", "0");
      var tmp = this.panel;
      setTimeout(function(){tmp.css("display", "none")},100);
      this.hideLinks();
   };
};

var hitahint = new HitAHintMode();
var linksearch = new LinkSearchMode();

var mode = undefined;


function start(e){
   var active = document.activeElement;
   if (e.keyCode == KEY.ESC) {
      e.preventDefault();
      active.blur();
      if (mode)
         mode.finish();
      return;
   }
   if (["INPUT", "TEXTAREA"].indexOf(active.tagName) != -1)
      return;
   
   if (mode)
      return;
   if (e.metaKey || e.ctrlKey)
      return;

   switch(e.keyCode) {
   case KEY.SLASH: case KEY.PERIOD:
      if (!search_enable || isDisabledSite())
         return;
      e.preventDefault();
      mode = linksearch;
      linksearch.init();
      break;
   case KEY.COMMA:
      if (!hitahint_enable || isDisabledSite())
         return;
      e.preventDefault();
      mode = hitahint;
      hitahint.init();
      break;

   case KEY.J:
      if (!other_enable || isDisabledSite())
         return;
      window.scrollBy(0,scrollValue);
      break;
   case KEY.K:
      if (!other_enable || isDisabledSite())
         return;
      window.scrollBy(0,-scrollValue);
      break;
   case KEY.Z:
      if (!other_enable || isDisabledSite())
         return;
      history.back();
      break;
   case KEY.X:
      if (!other_enable || isDisabledSite())
         return;
      history.forward();
      break;
   default:
//      console.log(e.keyCode);
      break;
   }
}

const frames = d.querySelectorAll('iframe, frame');
const docs = [d].concat($.map(frames, function(f){return f.contentDocument}));
$.map(docs, function(d){d.addEventListener('keydown', start)});
$.map(frames, function(f){f.addEventListener('load', function(e){
   e.target.contentDocument.addEventListener('keydown', start);
})});
