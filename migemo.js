// JavaScript/Migemo

var migemo = {
  initialize: function(path) {
    _migemo.dictdir_path = path?path:".";
    _migemo.romanToKanaDictionary = new _migemo.RomanToKanaDictionary();
    _migemo.dictionary = new _migemo.Dictionary();
    this.isInitialized = true;
  },

  query: function (pattern) {
    // return Japanese regular expression generated from pattern string
    if (!this.isInitialized) {
      this.initialize();
    }
    var patterns = _migemo.query(pattern);
    var patterns = _migemo.optimizePatterns(patterns);
    return patterns.toString();
  },

  uninitialize: function() {
    this.isInitialized = false;
    _migemo.dictionary = null;
    _migemo.romanToKanaDictionary = null;
    _migemo.dictdir_path = null;
  },

  isInitialized: false
}

var _migemo = {
  romanToKanaDictionary: null,
  dictionary: null,
  dictdir_path: null,
  
  query: function (roman) {
    // return Japanese regular expression created from Roman string
    var result = new _migemo.Node("", [new _migemo.Node(roman)]);
    var expandedRomans =
      _migemo.expandConsonant(_migemo.sanitizeDoubleConsonant(roman));
    for (var i in expandedRomans) {
      var h = _migemo.romanToKanaDictionary.lookup(expandedRomans[i]);
	result.children.push(new _migemo.Node(h)); 
	var k = _migemo.convertHiraganaToKatakana(h);
	result.children.push(new _migemo.Node(k));
	var kanji = _migemo.dictionary.lookup(h);
	for (var j in kanji) {
	    result.children.push(new _migemo.Node(kanji[j]));
	}
    }
    return result;
  },


  // -----------------------------------------------------------
  // Utility functions
  // -----------------------------------------------------------
  
  consistsOfStrings: function (array) {
    for (var i in array) {
      if (typeof array[i] != "string") {
        return false;
      }
    }
    return true;
  },

  optimizePatterns: function (patterns) {
    patterns = _migemo.extractCommonHeads(patterns);
    patterns = _migemo.groupSingleCharacters(patterns);
    patterns = _migemo.extractPrefix(patterns);
    return patterns;
  },

  expandConsonant: function (roman) {
    // k => ka, ki, ku, ke, ko
    // don => don, dona, doni, donu, done, dono, doxtu  # special case 1
    // doc  => dochi                                    # special case 3
    // dox  => (どっ どゃ どゅ どょ)                    # special case 4
    // etxusy => (えっしゃ えっしゅ えっしょ)           # special case 5
    // ny => (nya,nyu,nyo)                              # special case 6
    var result = new Array();
    if (_migemo.endsWithConsonant(roman)) {
      if (roman.slice(-1)=="c") {  // special case 3
        result.push(roman+"hi");
      } else if (roman.slice(-1)=="x") { // special case 4
        result.push(roman+"tu");
        result.push(roman+"ya");
        result.push(roman+"yu");
        result.push(roman+"yo");
      } else if (roman.slice(-5)=="xtusy" || // special case 5
                 roman.slice(-2)=="ny" ||    // special case 6
                 roman.slice(-1)=="y") {
        result.push(roman+"a");
        result.push(roman+"u");
        result.push(roman+"o");
      } else {
        var vowel = ["a","i","u","e","o"];
        for (var i in vowel) {
          result.push(roman+vowel[i]);
        }
        if (roman.slice(-2)!="sh" && roman.slice(-1)!="n") { // special case 7
          var c = roman.slice(-1);
          for (var i=0; i<vowel.length; i++) {
            result.push(roman.slice(0,-1)+"xtu"+c+vowel[i]);
          }
        }
        if (roman.slice(-1)=="n") {  // special case 1
          result.push(roman+"n");
        }
      }
    } else {
      result.push(roman);
    }
    return result;
  },

  endsWithConsonant: function (roman) {
    return RegExp(/[ckgszjtdhfpbmyrwxn]$/).test(roman);
  },

  sanitizeDoubleConsonant: function (roman) {
    // kk -> xtuk
    table = {"ss":"xtus", "kk":"xtuk", "tt":"xtut", "pp":"xtup", "gg":"xtug",
             "dd":"xtud", "zz":"xtuz", "cc":"xtuc"};
    for (p in table) {
      roman = roman.replace(RegExp(p, "g"), table[p]);
    }
    return roman;
  },

  RomanToKanaDictionary: function () {
    // Roman/Kana Dictionary class
    this.lookup = function(key) {
      return this.convertRomanToHiragana(key);
    }

    this.convertRomanToHiragana = function(roman) {
      // ippan -> いっぱん
      var kana = _migemo.sanitizeDoubleConsonant(roman);
      for (var i in this.romanPatterns) {
        var r = this.romanPatterns[i];
        kana = kana.replace(RegExp(r, "g"), _migemo.romanToHiraganaTable[r]);
      }
      return kana;
    }
    
    // initialization
    this.romanPatterns = new Array();
    for (p in _migemo.romanToHiraganaTable) {
      this.romanPatterns.push(p);
    }
    this.romanPatterns.sort(function(x, y) {return y.length - x.length;});
  },

  convertHiraganaToKatakana: function (kana) {
    // ほげ -> ホゲ
    var hiragana = "あいうえおかきくけこさしすせそたちつてとなにぬねの" +
                   "はひふへほまみむめもやゆよらりるれろわゐゑをん" +
                   "がぎぐげござじずぜぞだじづでどばびぶべぼ" +
                   "ぱぴぷぺぽゃゅょぁぃぅぇぉっ";
    var katakana = "アイウエオカキクケコサシスセソタチツテトナニヌネノ" +
                   "ハヒフヘホマミムメモヤユヨラリルレロワヰヱヲン" +
                   "ガギグゲゴザジズゼゾダジヅデドバビブベボ" +
                   "パピプペポャュョァィゥェォッ";
    for (var i=0; i<hiragana.length; i++) {
      kana = kana.replace(RegExp(hiragana.slice(i,i+1), "g"), 
                          katakana.slice(i,i+1));
    }
    return kana;
  },
  
  romanToHiraganaTable: {
    "a":"あ", "i":"い", "u":"う", "e":"え", "o":"お",
    "ka":"か", "ki":"き", "ku":"く", "ke":"け", "ko":"こ",
    "sa":"さ", "si":"し", "shi":"し", "su":"す", "se":"せ", "so":"そ",
    "ta":"た", "ti":"ち", "tu":"つ", "te":"て",  "to":"と",
    "chi":"ち", "tsu":"つ", 
    "na":"な", "ni":"に", "nu":"ぬ", "ne":"ね", "no":"の",
    "ha":"は", "hi":"ひ", "fu":"ふ", "hu":"ふ", "he":"へ", "ho":"ほ",
    "ma":"ま", "mi":"み", "mu":"む", "me":"め", "mo":"も",
    "ya":"や", "yu":"ゆ", "yo":"よ",
    "ra":"ら", "ri":"り", "ru":"る", "re":"れ", "ro":"ろ",
    "wa":"わ", "wo":"を", "n":"ん", "nn":"ん",
    "ba":"ば", "bi":"び", "bu":"ぶ", "be":"べ", "bo":"ぼ",
    "ga":"が", "gi":"ぎ", "gu":"ぐ", "ge":"げ", "go":"ご",
    "za":"ざ", "zi":"じ", "ji":"じ", "zu":"ず", "ze":"ぜ", "zo":"ぞ",
    "da":"だ", "di":"ぢ", "du":"づ", "de":"で", "do":"ど",
    "sha":"しゃ", "shu":"しゅ", "she":"しぇ", "sho":"しょ", 
    "sya":"しゃ", "syu":"しゅ","syo":"しょ",
    "nya":"にゃ", "nyu":"にゅ", "nyo":"にょ", 
    "ja":"じゃ", "ji":"じ", "ju":"じゅ", "je":"じぇ", "jo":"じょ", 
    "-":"ー", "xtu":"っ", "dhi":"でぃ",
    "bya":"びゃ", "byu":"びゅ", "byo":"びょ",
    "gya":"ぎゃ", "gyu":"ぎゅ", "gyo":"ぎょ", 
    "kya":"きゃ", "kyu":"きゅ", "kyo":"きょ",
    "cha":"ちゃ", "chu":"ちゅ", "cho":"ちょ", 
    "tya":"ちゃ", "tyu":"ちゅ", "tyo":"ちょ",
    "hya":"ひゃ", "hyu":"ひゅ", "hyo":"ひょ", 
    "thi":"てぃ",
    "la":"ぁ", "li":"ぃ", "lu":"ぅ", "le":"ぇ", "lo":"ぉ", 
    "xa":"ぁ", "xi":"ぃ", "xu":"ぅ", "xe":"ぇ", "xo":"ぉ", 
    "xya":"ゃ", "xyu":"ゅ", "xyo":"ょ",
    "pa":"ぱ", "pi":"ぴ", "pu":"ぷ", "pe":"ぺ", "po":"ぽ",
    "va":"う゛ぁ", "vi":"う゛ぃ", "vu":"う゛", "ve":"う゛ぇ", "vo":"う゛ぉ", 
    "wo":"を"
    },

  extractCommonHeads: function (pattern) {
    // 画,画像,画質 => 画
    var extractedPattern = new _migemo.Node(pattern.value);
    var prefix = null;
    var children = pattern.children;
    children.sort(function(x,y){return _migemo.compareStrings(x.value,
                                                              y.value);});
    for (i in children) {
      var p = children[i];
      if (prefix && prefix.test(p.value)) {
        // pass
      } else {
        extractedPattern.addChild(p);
        prefix = RegExp("^"+p.value);
      }
    }
    return extractedPattern;
  },

  groupSingleCharacters: function (pattern) {
    // （古|子|個）=> [古子個]
    var groupedPattern = new _migemo.Node(pattern.value);
    var singleCharacters = [];
    for (var i=0; i<pattern.children.length; i++) {
	var p = pattern.children[i];
	if (p.value.length==1) {
	    singleCharacters.push(p.value);
	} else {
	    groupedPattern.addChild(p);
	}
    }
    if (singleCharacters.length>0) {
	groupedPattern.addChild(
          new _migemo.Node("["+singleCharacters.join("")+"]"));
    }
    return groupedPattern;
  },

  extractPrefix: function (pattern) {
    // (あああ,ああい,ああう) ->  (あ(あ(あ,い,う)))
    var extractedPattern = new _migemo.Node(pattern.value);
    var children = pattern.children;
    children.sort(function(x,y){return _migemo.compareStrings(x.value,
                                                              y.value);});
    while (children.length > 0) {
	var currentNode = children.shift();
	var initialCharacter = currentNode.value.slice(0,1);
	var friends = new Array();
	while (children.length > 0) {
	    if (children[0].value.slice(0,1) == initialCharacter) {
		var p = children.shift();
		p.value = p.value.slice(1);
		friends.push(p);
	    } else {
		break;
	    }
	}
	if (friends.length==0) {
	    extractedPattern.addChild(currentNode);
	} else {
	    friends.unshift(new _migemo.Node(currentNode.value.slice(1)));
	    var x = _migemo.extractPrefix(new _migemo.Node(initialCharacter,
                                                           friends));
	    extractedPattern.addChild(x);
	}
    }
    return extractedPattern;
  },

 Dictionary: function(){
    this.lookup = function(key) {
    var initial = key[0];
    var candidates = migemoDict[initial];
    var ans = [];
    for(var word in candidates) if (!word.indexOf(key)) ans = ans.concat(candidates[word]);
    return ans;
    }
  },

  Node: function (value, children) {
    // Node class - used as tree node
    this.value = value;
    if (children) {
      this.children = children;
    } else {
      this.children = [];
    }
    
    this.toString = function() {
      var result = this.value;
      if (this.children.length > 0) {
        var childStrings = [];
        for (var i=0; i<this.children.length; i++) {
          childStrings.push(this.children[i].toString());
        }
        if (this.value=="") {
          result = childStrings.join("|");
        } else {
          result += "(" + childStrings.join("|")  + ")";
        }
      }
      return  result;
    }
    
    this.toArray = function() {
      var result = [this.value];
      for (var i=0; i<this.children.length; i++) {
        var c = this.children[i];
        if (c.children.length == 0) {
          result.push(c.value);
        } else {
          result.push(c.toArray());
        }
      }
      return result;
    }
    
    this.addChild = function(node) {
      this.children.push(node);
    }
  },

  compareStrings: function (x, y){
    var result;
    if (x.slice(0,y.length)==y) {
      result = 0;
    } else if (x < y) {
      result = -1;
    } else if (x > y) {
      result = 1;
    }
    return result;
  },

  formatArray: function (array) {
    // format array into human readable string. used only for debug
    var strings = new Array();
    for (i in array) {
      var x = array[i];
      if (typeof x == "string") {
        strings.push(x);
      } else {
        strings.push(_migemo.formatArray(x));
      }
    }
    return "("+strings.join(",")+")";
  },

  joinPath: function (parent, child) {
    return parent + (parent.slice(-1)=="/"?"":"/") + child;
  }
}


//migemo.initialize();

