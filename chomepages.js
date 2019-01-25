try{
var page = require('webpage').create(),
  fs = require("fs"), base, sdom, rank, np,
  casper = require('casper').create({
        verbose: true,
        links : "",
        scripts: "",
        rank : "",
        url : "",
        rurl: "", // real domain
        purl : "",
        headers: "",
	onResourceReceived : function(slf, res){
		responses[i++] = res;
	},
	onResourceRequested : function(slf, req){
		requests[q++] = req;
	},
  pageSettings: {
          loadImages: true,
          loadPlugins: false,
          webSecurityEnabled: false,
          userAgent : "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.63 Safari/537.36",
        },
});
casper.log = function(msg, err){};
casper.on("step.error", function(){casper.exit();});
casper.on("timeout", function(){this.clear(); this.exit();});
casper.options.timeout = 300000;

if (casper.cli.args.length === 1) {
  casper.exit();
} else {
	args = casper.cli.args;
	base = args[0];
	sdom = args[1];
	rank = args[2];
}

var responses = [], i=0, requests = [], q=0, las = {}, curl = "", sdomdecoded = false, cheaders = "", crawlurl = sdom;
if(sdom == "yahoo.com")
  crawlurl = "us."+sdom;
else if(sdom == "google.com")
  crawlurl = sdom + "/ncr";
casper.start();
casper.then(function(){
});
casper.thenOpen('http://' + crawlurl, function(siteResp){
	if(siteResp.status === 200){
		cheaders = siteResp;
		try{
      las = this.evaluate(scrap, sdom);
    }catch(e){this.exit();}
	}
});

casper.run(function(){
  try{
  var metadata = base + rank + "_" + sdom + "/pages/0.txt";
  if(responses){
      for(var r =0; r<responses.length; r++){
              var response = responses[r];
              if(response.stage === "end"){
                      var ctype = response.contentType;
                      if(ctype){
                              if(ctype.indexOf("javascript") >=0){
                                      las.sr[response.url] = "JS";
                              }else if(ctype.indexOf("css") >=0){
                                      las.styles[response.url] = "CSS";
                              }else if(ctype.indexOf("image") >=0 && response.url.indexOf("data") != 0){
                                      las.images[response.url] = "IMG";
                              }
                      }
              }
      }
  }
   var csp = "", csps = [];
  if(cheaders && cheaders["headers"]){
	  var hders = cheaders["headers"];
	  for(var h=0; h<hders.length; h++){
		  var name = hders[h].name, value = hders[h].value;
		  if(name.toLowerCase().indexOf("content-security-policy") >= 0){
			  //console.log(value);
			  var obj = {};
			  	obj[name] = value;
			  csps.push(obj);
		  }
	  }
  }
  	//Add other CSPs extracted from the main page...
  for(var key in las.csp){
	  var obj = {};
	  	obj[key] = las.csp[key];
	  csps.push(obj);
  }
  
  //las["response"] = responses;
  //las["request"] = requests;
  las["headers"] = cheaders;
  las["csps"] = csps;
  fs.write(metadata, JSON.stringify(las));
  this.clear();
	casper.done();
  }catch(e){this.exit();}
});
}catch(e){casper.exit()};


function scrap(surl){
        // Select all links in the page
  try{
  var lks = document.getElementsByTagName("a"),  // links and pages
    scripts = document.getElementsByTagName("script"), // scripts
    frames = document.getElementsByTagName('iframe'), // frames
    images = document.getElementsByTagName("img"), // Images
    styles = document.getElementsByTagName("link"), // StyleSheets
    audios = document.getElementsByTagName("audio"), // Audios
    videos = document.getElementsByTagName("video"), // Videos
    metas = document.getElementsByTagName("meta"), /// Meta tags, for content security policies...
    alllinks = {}, rhrefs = {},
    srcs = [], sc = 0,
    iframes = {}, pictures = {}, css = {}, a_medias = {}, v_medias = {}, csps = {},
    innerCodes = [], ic = 0,
    or = surl,
    protocol = document.location.protocol;
  //We keep only links that are from the same site and not subdomains
  for(var l=0; l<lks.length; l++){
    if(lks[l].hostname.indexOf(or) + or.length === lks[l].hostname.length){
      if(!(lks[l].href in rhrefs)){
        rhrefs[lks[l].href] = "href";
      }
    }
    alllinks[lks[l].href] = "href";
  }
  var aLink = document.createElement("a");
  if(scripts){
    var script = "";
    for(var s = 0; s<scripts.length; s++){
      script = scripts[s];

        //Filter JavaScript codes

      if(!script.type || script.type === "text/javascript" || (script.language && script.language.indexOf('javascript') >=0)){
        var srcc = script.getAttribute('src'); // Get the src value here
        if(srcc){
          aLink.href = srcc;
          srcs[sc] = aLink.href; // We want to filter srcs. And keep a unique version of each
          sc++;
        }
        if(script.innerHTML){
                innerCodes[ic] = script.innerHTML; // Get the text here
                ic++;
        }
      }
    }
  }
    ////// Frames
  if(frames){
    for(var f=0; f<frames.length; f++){
      if(frames[f].src){
        aLink.href = frames[f].src;
        iframes[aLink.href] = frames[f].sandbox;
      }
    }
  }
    ///// Images
  if(images){
    for(var i=0; i<images.length; i++){
      if(images[i].src){
        aLink.href = images[i].src;
        pictures[aLink.href] = "";
      }
    }
  }
    ///// Stylesheets
  if(styles){
    for(var s=0; s<styles.length; s++){
      if(styles[s].href){
        aLink.href = styles[s].href;
        css[aLink.href] = "";
      }
    }
  }
    ///// Audios
  if(audios){
    for(var a=0; a<audios.length; a++){
      var ssrc = audios[a].getAttribute("src");
                if(ssrc){
        aLink.href = ssrc;
        a_medias[aLink.href] = "";
      }
      var sources = audios[a].getElementsByTagName("source");
      if(sources){
        for(var as=0; as<sources.length; as++){
          var ssrc = sources[as].getAttribute("src");
                        if(ssrc){
            aLink.href = ssrc;
            a_medias[aLink.href] = "";
          }
        }
      }

    }
  }
    ////// Videos
  if(videos){
            for(var v=0; v<videos.length; v++){
              var ssrc = videos[v].getAttribute("src");
              if(ssrc){
                aLink.href = ssrc;
                  v_medias[aLink.href] = "";
              }
                    var sources = videos[v].getElementsByTagName("source");
                    if(sources){
                            for(var as=0; as<sources.length; as++){
                                var ssrc = sources[as].getAttribute("src");
                                    if(ssrc){
                  aLink.href = ssrc;
                  v_medias[aLink.href] = "";
                }
                            }
                    }
            }
        }
        
        //Meta tags...
  if(metas){
  	var meta = "";
  	for(var m=0; m<metas.length; m++){
  		meta = metas[m];
  		if(meta.httpEquiv && meta.httpEquiv.toLowerCase().indexOf("content-security-policy") >= 0){
  			csps[meta.httpEquiv] = meta.content;
  		}
  	}
  }
  

  ////
  return {csp: csps, alinks: alllinks, as: rhrefs, sr: srcs, texts: innerCodes, frames : iframes, images: pictures, styles: css, audios: a_medias, videos: v_medias, host : document.location.hostname, origin : document.location.origin, protocol : protocol}; // Return an object with the javascript src urls and the innner codes
  }catch(e){return null;}
}
