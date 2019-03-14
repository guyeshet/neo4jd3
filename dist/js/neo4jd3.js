(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Neo4jd3 = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(_dereq_,module,exports){
'use strict';

var neo4jd3 = _dereq_('./scripts/neo4jd3');

module.exports = neo4jd3;

},{"./scripts/neo4jd3":2}],2:[function(_dereq_,module,exports){
/* global d3, document */
/* jshint latedef:nofunc */
'use strict';

function Neo4jD3(_selector, _options) {
  var container, graph, info, node, nodes, relationship, relationshipOutline, relationshipOverlay, relationshipText, relationships, selector, simulation, svg, svgNodes, svgRelationships, svgScale, svgTranslate,
    classes2colors = {},
    justLoaded = false,
    numClasses = 0,
    options = {
      arrowSize: 2,
      colors: colors(),
      highlight: undefined,
      iconMap: fontAwesomeIcons(),
      icons: undefined,
      imageMap: {},
      images: undefined,
      infoPanel: true,
      minCollision: undefined,
      neo4jData: undefined,
      neo4jDataUrl: undefined,
      nodeOutlineFillColor: undefined,
      nodeRadius: 75,
      relationshipColor: '#a5abb6',
      zoomFit: false,
      labelColorMapping: createLabelColorMapping(),
      labelProperty: 'name',
      imageSize: {
        height: '30px',
        width: '30px',
        x: '-15px',
        y: '-16px',
      }
    },
    VERSION = '0.0.1';

  function createLabelColorMapping(){
    var labelColorMapping = {
      "customer": "#68bdf6",
      "account": "#ffd86e",
      "ownbankaccount": "#6dce9e",
      "otherbankaccount": "#ff867f",
      "ruleviolation": "#ffa82d"
    };

    return labelColorMapping;
  }

  function appendGraph(container) {
    svg = container.append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('class', 'neo4jd3-graph')
      .call(d3.zoom().on('zoom', function() {
        var scale = d3.event.transform.k,
          translate = [d3.event.transform.x, d3.event.transform.y];

        if (svgTranslate) {
          translate[0] += svgTranslate[0];
          translate[1] += svgTranslate[1];
        }

        if (svgScale) {
          scale *= svgScale;
        }

        svg.attr('transform', 'translate(' + translate[0] + ', ' + translate[1] + ') scale(' + scale + ')');
      }))
      .on('dblclick.zoom', null)
      .append('g')
      .attr('width', '100%')
      .attr('height', '100%');

    svgRelationships = svg.append('g')
      .attr('class', 'relationships');

    svgNodes = svg.append('g')
      .attr('class', 'nodes');
  }

  function appendImageToNode(node) {
    return node.append('image')
      .attr('height', function(d) {
        return icon(d) ? '24px': options.imageSize.height;
      })
      .attr('x', function(d) {
        return icon(d) ? '5px': options.imageSize.x;
      })
      .attr('xlink:href', function(d) {
        return image(d);
      })
      .attr('y', function(d) {
        return icon(d) ? '5px': options.imageSize.y;
      })
      .attr('width', function(d) {
        return icon(d) ? '24px': options.imageSize.width;
      });
  }

  function appendInfoPanel(container) {
    return container.append('div')
      .attr('class', 'neo4jd3-info');
  }

  function appendInfoElement(cls, isNode, property, value) {
    var elem = info.append('a');

    elem.attr('href', '#')
      .attr('class', cls)
      .html('<strong>' + property + '</strong>' + (value ? (': ' + value) : ''));
    if (!value) {
      elem.style('background-color', function(d) {
          var theProperty = property.toLowerCase();

          if (theProperty in options.labelColorMapping) {
            return options.labelColorMapping[theProperty];
          }

        return options.nodeOutlineFillColor ? options.nodeOutlineFillColor : (isNode ? class2color(property) : defaultColor());
      })
        .style('border-color', function(d) {
          var theProperty = property.toLowerCase();

          if (theProperty in options.labelColorMapping){
            return options.labelColorMapping[theProperty];
          }
          return options.nodeOutlineFillColor ? class2darkenColor(options.nodeOutlineFillColor) : (isNode ? class2darkenColor(property) : defaultDarkenColor());
        })
        .style('color', function(d) {
          return options.nodeOutlineFillColor ? class2darkenColor(options.nodeOutlineFillColor) : '#fff';
        });
    }
  }

  function appendInfoElementClass(cls, node) {
    appendInfoElement(cls, true, node);
  }

  function appendInfoElementProperty(cls, property, value) {
    appendInfoElement(cls, false, property, value);
  }

  function appendInfoElementRelationship(cls, relationship) {
    appendInfoElement(cls, false, relationship);
  }

  function appendNode() {
    return node.enter()
      .append('g')
      .attr('class', function(d) {
        var highlight, i,
          classes = 'node',
          label = d.labels[0];

        if (icon(d)) {
          classes += ' node-icon';
        }

        if (image(d)) {
          classes += ' node-image';
        }

        if (options.highlight) {
          for (i = 0; i < options.highlight.length; i++) {
            highlight = options.highlight[i];

            if (d.labels[0] === highlight.class && d.properties[highlight.property] === highlight.value) {
              classes += ' node-highlighted';
              break;
            }
          }
        }

        return classes;
      })
      .on('click', function(d) {
        d.fx = d.fy = null;

        if (typeof options.onNodeClick === 'function') {
          options.onNodeClick(d);
        }
      })
      .on('dblclick', function(d) {
        stickNode(d);

        if (typeof options.onNodeDoubleClick === 'function') {
          options.onNodeDoubleClick(d);
        }
      })
      .on('mouseenter', function(d) {
        if (info) {
          updateInfo(d);
        }

        if (typeof options.onNodeMouseEnter === 'function') {
          options.onNodeMouseEnter(d);
        }
      })
      .on('mouseleave', function(d) {
        if (info) {
          clearInfo(d);
        }

        if (typeof options.onNodeMouseLeave === 'function') {
          options.onNodeMouseLeave(d);
        }
      })

    .call(d3.drag()
    .on('start', dragStarted)
    .on('drag', dragged)
    .on('end', dragEnded));
  }

  function truncateText(str, length) {
    str = str || '';

    var ending = '...';

    if (length == null) {
      length = 100;
    }

    if (str.length > length) {
      return str.substring(0, length - ending.length) + ending;
    } else {
      return str;
    }
  }

  function calculateXLocation(name) {
    return name.length;
  }

  function appendNodeNameText(node) {
    // going to need to link this to node width/ hieght at some point
    var g = node.append('g');

    g.append("rect")
      .attr("width", '80px')
      .attr("height", '20px')
      .style("fill", function(d){
        return "#000000";
      })
      .attr('y', 24)
      .attr('x', -40)
      .attr('rx', 10)
      .attr('ry', 10);

    g.append('text')
      .text(function(node) {
        var x = node.labels;
        return truncateText(node.properties[options.labelProperty], 13);
      })
      .attr('font-size', 10)
      .attr('color', '#bdc3c7')
      .attr('x', function(node){
        return 0;
        //return calculateXLocation(node.properties.name);
      })
      .attr('y', 33)
      .attr('text-anchor', 'middle')
      .attr('alignment-baseline', 'central')
      .on('click', function(d) {
        if (typeof options.onNodeTextClick === 'function') {
          options.onNodeTextClick(d);
        }
      });
  }

  function appendNodeInfo(node) {
    if (!options.onNodeInfoClick || !options.displayInfoIcon) {
      return;
    }

    var g = node.append('g')
      .attr('class', 'info')
      .attr('transform', 'translate(9, -28)')
      .attr("visibility", function(d) {
        return options.displayInfoIcon(d) ? "" : "hidden";
      })
      .on('click', function(d) {
        if (typeof options.onNodeInfoClick === 'function') {
          options.onNodeInfoClick(d);
        }
      });

    g.append('rect')
      .attr('width', '20px')
      .attr('height', '20px')
      .style('fill', '#54b3ff')
      .style('stroke', '#54b3ff')
      .attr('rx', 10)
      .attr('ry', 10);
    
    g.append('text')
      .text('i')
      .attr('fill', 'white')
      .attr('font-size', 11)
      .attr('x', '9')
      .attr('y', '14');
  }

  function appendNodeToGraph() {
    var n = appendNode();

    appendRingToNode(n);
    appendOutlineToNode(n);

    if (options.icons) {
      appendTextToNode(n);
    }

    if (options.images) {
      appendImageToNode(n);
    }

    appendNodeNameText(n);
    appendNodeInfo(n);

    return n;
  }

  function appendOutlineToNode(node) {
    return node.append('circle')
      .attr('class', 'outline')
      .attr('r', options.nodeRadius)
      .style('fill', function(d) {
        var label = d.labels;

        if (label.length === 0){
          return 'gray';
        }

        var the_label = label[0].toLowerCase();
        if (the_label in options.labelColorMapping){
          return options.labelColorMapping[the_label];
        }

        return options.nodeOutlineFillColor ? options.nodeOutlineFillColor : class2color(d.labels[0]);
      })
      .style('stroke', function(d) {
        var label = d.labels;

        if (label.length === 0){
          return 'gray';
        }

        var the_label = label[0].toLowerCase();
        if (the_label in options.labelColorMapping){
          return options.labelColorMapping[the_label];
        }
        return options.nodeOutlineFillColor ? class2darkenColor(options.nodeOutlineFillColor) : class2darkenColor(d.labels[0]);
      })
      .append('title').text(function(d) {
        return toString(d);
      });
  }

  function appendRingToNode(node) {
    return node.append('circle')
      .attr('class', 'ring')
      .attr('r', options.nodeRadius * 1.16)
      .append('title').text(function(d) {
        return toString(d);
      });
  }

  function appendTextToNode(node) {
    return node.append('text')
      .attr('class', function(d) {
        return 'text' + (icon(d) ? ' icon' : '');
      })
      .attr('fill', '#ffffff')
      .attr('font-size', function(d) {
        return icon(d) ? (options.nodeRadius + 'px') : '10px';
      })
      .attr('pointer-events', 'none')
      .attr('text-anchor', 'middle')
      .attr('y', function(d) {
        return icon(d) ? (parseInt(Math.round(options.nodeRadius * 0.32)) + 'px') : '4px';
      })
      .html(function(d) {
        var _icon = icon(d);
        return _icon ? '&#x' + _icon : d.id;
      });
  }

  function appendRelationship() {
    return relationship.enter()
      .append('g')
      .attr('class','relationship')
      .on('dblclick', function(d) {
        if (typeof options.onRelationshipDoubleClick === 'function') {
          options.onRelationshipDoubleClick(d);
        }
      })
      .on('mouseenter', function(d) {
        if (info) {
          updateInfo(d);
        }
      });
  }

  function appendOutlineToRelationship(r) {
    return r.append('path')
      .attr('class', 'outline')
      .attr('fill', '#a5abb6')
      .attr('stroke-width', function(d,i){
        return 1;
      })
      .attr('stroke', function(d)
        {
          return '#a5abb6';
        });
  }

  function appendOverlayToRelationship(r) {
    return r.append('path')
      .attr('class', 'overlay');
  }

  function appendTextToRelationship(r) {
    return r.append('text')
      .attr('class', 'text')
      .attr('fill', '#000000')
      .attr('font-size', '8px')
      .attr('pointer-events', 'none')
      .attr('text-anchor', 'middle')
      .text(function(d) {
        return d.type;
      });
  }

  function appendRelationshipToGraph() {
    var relationship = appendRelationship();

    var text = appendTextToRelationship(relationship);

    var outline = appendOutlineToRelationship(relationship);
    var overlay = appendOverlayToRelationship(relationship);

    return {
      outline: outline,
      overlay: overlay,
      relationship: relationship,
      text: text
    };
  }

  function class2color(cls) {
    var color = classes2colors[cls];

    if (!color) {
      //            color = options.colors[Math.min(numClasses, options.colors.length - 1)];
      color = options.colors[numClasses % options.colors.length];
      classes2colors[cls] = color;
      numClasses++;
    }

    return color;
  }

  function class2darkenColor(cls) {
    return d3.rgb(class2color(cls)).darker(1);
  }

  function clearInfo() {
    info.html('');
  }

  function color() {
    return options.colors[options.colors.length * Math.random() << 0];
  }

  function colors() {
    // d3.schemeCategory10,
    // d3.schemeCategory20,
    return [
      '#68bdf6', // light blue
      '#6dce9e', // green #1
      '#faafc2', // light pink
      '#f2baf6', // purple
      '#ff928c', // light red
      '#fcea7e', // light yellow
      '#ffc766', // light orange
      '#405f9e', // navy blue
      '#a5abb6', // dark gray
      '#78cecb', // green #2,
      '#b88cbb', // dark purple
      '#ced2d9', // light gray
      '#e84646', // dark red
      '#fa5f86', // dark pink
      '#ffab1a', // dark orange
      '#fcda19', // dark yellow
      '#797b80', // black
      '#c9d96f', // pistacchio
      '#47991f', // green #3
      '#70edee', // turquoise
      '#ff75ea'  // pink
    ];
  }

  function contains(array, id) {
    var filter = array.filter(function(elem) {
      return elem.id === id;
    });

    return filter.length > 0;
  }

  function defaultColor() {
    return options.relationshipColor;
  }

  function defaultDarkenColor() {
    return d3.rgb(options.colors[options.colors.length - 1]).darker(1);
  }

  function dragEnded(d) {
    if (!d3.event.active) {
      simulation.alphaTarget(0);
    }

    if (typeof options.onNodeDragEnd === 'function') {
      options.onNodeDragEnd(d);
    }
  }

  function dragged(d) {
    stickNode(d);
  }

  function dragStarted(d) {
    if (!d3.event.active) {
      simulation.alphaTarget(0.3).restart();
    }

    d.fx = d.x;
    d.fy = d.y;

    if (typeof options.onNodeDragStart === 'function') {
      options.onNodeDragStart(d);
    }
  }

  function extend(obj1, obj2) {
    var obj = {};

    merge(obj, obj1);
    merge(obj, obj2);

    return obj;
  }

  function fontAwesomeIcons() {
    return {'glass':'f000','music':'f001','search':'f002','envelope-o':'f003','heart':'f004','star':'f005','star-o':'f006','user':'f007','film':'f008','th-large':'f009','th':'f00a','th-list':'f00b','check':'f00c','remove,close,times':'f00d','search-plus':'f00e','search-minus':'f010','power-off':'f011','signal':'f012','gear,cog':'f013','trash-o':'f014','home':'f015','file-o':'f016','clock-o':'f017','road':'f018','download':'f019','arrow-circle-o-down':'f01a','arrow-circle-o-up':'f01b','inbox':'f01c','play-circle-o':'f01d','rotate-right,repeat':'f01e','refresh':'f021','list-alt':'f022','lock':'f023','flag':'f024','headphones':'f025','volume-off':'f026','volume-down':'f027','volume-up':'f028','qrcode':'f029','barcode':'f02a','tag':'f02b','tags':'f02c','book':'f02d','bookmark':'f02e','print':'f02f','camera':'f030','font':'f031','bold':'f032','italic':'f033','text-height':'f034','text-width':'f035','align-left':'f036','align-center':'f037','align-right':'f038','align-justify':'f039','list':'f03a','dedent,outdent':'f03b','indent':'f03c','video-camera':'f03d','photo,image,picture-o':'f03e','pencil':'f040','map-marker':'f041','adjust':'f042','tint':'f043','edit,pencil-square-o':'f044','share-square-o':'f045','check-square-o':'f046','arrows':'f047','step-backward':'f048','fast-backward':'f049','backward':'f04a','play':'f04b','pause':'f04c','stop':'f04d','forward':'f04e','fast-forward':'f050','step-forward':'f051','eject':'f052','chevron-left':'f053','chevron-right':'f054','plus-circle':'f055','minus-circle':'f056','times-circle':'f057','check-circle':'f058','question-circle':'f059','info-circle':'f05a','crosshairs':'f05b','times-circle-o':'f05c','check-circle-o':'f05d','ban':'f05e','arrow-left':'f060','arrow-right':'f061','arrow-up':'f062','arrow-down':'f063','mail-forward,share':'f064','expand':'f065','compress':'f066','plus':'f067','minus':'f068','asterisk':'f069','exclamation-circle':'f06a','gift':'f06b','leaf':'f06c','fire':'f06d','eye':'f06e','eye-slash':'f070','warning,exclamation-triangle':'f071','plane':'f072','calendar':'f073','random':'f074','comment':'f075','magnet':'f076','chevron-up':'f077','chevron-down':'f078','retweet':'f079','shopping-cart':'f07a','folder':'f07b','folder-open':'f07c','arrows-v':'f07d','arrows-h':'f07e','bar-chart-o,bar-chart':'f080','twitter-square':'f081','facebook-square':'f082','camera-retro':'f083','key':'f084','gears,cogs':'f085','comments':'f086','thumbs-o-up':'f087','thumbs-o-down':'f088','star-half':'f089','heart-o':'f08a','sign-out':'f08b','linkedin-square':'f08c','thumb-tack':'f08d','external-link':'f08e','sign-in':'f090','trophy':'f091','github-square':'f092','upload':'f093','lemon-o':'f094','phone':'f095','square-o':'f096','bookmark-o':'f097','phone-square':'f098','twitter':'f099','facebook-f,facebook':'f09a','github':'f09b','unlock':'f09c','credit-card':'f09d','feed,rss':'f09e','hdd-o':'f0a0','bullhorn':'f0a1','bell':'f0f3','certificate':'f0a3','hand-o-right':'f0a4','hand-o-left':'f0a5','hand-o-up':'f0a6','hand-o-down':'f0a7','arrow-circle-left':'f0a8','arrow-circle-right':'f0a9','arrow-circle-up':'f0aa','arrow-circle-down':'f0ab','globe':'f0ac','wrench':'f0ad','tasks':'f0ae','filter':'f0b0','briefcase':'f0b1','arrows-alt':'f0b2','group,users':'f0c0','chain,link':'f0c1','cloud':'f0c2','flask':'f0c3','cut,scissors':'f0c4','copy,files-o':'f0c5','paperclip':'f0c6','save,floppy-o':'f0c7','square':'f0c8','navicon,reorder,bars':'f0c9','list-ul':'f0ca','list-ol':'f0cb','strikethrough':'f0cc','underline':'f0cd','table':'f0ce','magic':'f0d0','truck':'f0d1','pinterest':'f0d2','pinterest-square':'f0d3','google-plus-square':'f0d4','google-plus':'f0d5','money':'f0d6','caret-down':'f0d7','caret-up':'f0d8','caret-left':'f0d9','caret-right':'f0da','columns':'f0db','unsorted,sort':'f0dc','sort-down,sort-desc':'f0dd','sort-up,sort-asc':'f0de','envelope':'f0e0','linkedin':'f0e1','rotate-left,undo':'f0e2','legal,gavel':'f0e3','dashboard,tachometer':'f0e4','comment-o':'f0e5','comments-o':'f0e6','flash,bolt':'f0e7','sitemap':'f0e8','umbrella':'f0e9','paste,clipboard':'f0ea','lightbulb-o':'f0eb','exchange':'f0ec','cloud-download':'f0ed','cloud-upload':'f0ee','user-md':'f0f0','stethoscope':'f0f1','suitcase':'f0f2','bell-o':'f0a2','coffee':'f0f4','cutlery':'f0f5','file-text-o':'f0f6','building-o':'f0f7','hospital-o':'f0f8','ambulance':'f0f9','medkit':'f0fa','fighter-jet':'f0fb','beer':'f0fc','h-square':'f0fd','plus-square':'f0fe','angle-double-left':'f100','angle-double-right':'f101','angle-double-up':'f102','angle-double-down':'f103','angle-left':'f104','angle-right':'f105','angle-up':'f106','angle-down':'f107','desktop':'f108','laptop':'f109','tablet':'f10a','mobile-phone,mobile':'f10b','circle-o':'f10c','quote-left':'f10d','quote-right':'f10e','spinner':'f110','circle':'f111','mail-reply,reply':'f112','github-alt':'f113','folder-o':'f114','folder-open-o':'f115','smile-o':'f118','frown-o':'f119','meh-o':'f11a','gamepad':'f11b','keyboard-o':'f11c','flag-o':'f11d','flag-checkered':'f11e','terminal':'f120','code':'f121','mail-reply-all,reply-all':'f122','star-half-empty,star-half-full,star-half-o':'f123','location-arrow':'f124','crop':'f125','code-fork':'f126','unlink,chain-broken':'f127','question':'f128','info':'f129','exclamation':'f12a','superscript':'f12b','subscript':'f12c','eraser':'f12d','puzzle-piece':'f12e','microphone':'f130','microphone-slash':'f131','shield':'f132','calendar-o':'f133','fire-extinguisher':'f134','rocket':'f135','maxcdn':'f136','chevron-circle-left':'f137','chevron-circle-right':'f138','chevron-circle-up':'f139','chevron-circle-down':'f13a','html5':'f13b','css3':'f13c','anchor':'f13d','unlock-alt':'f13e','bullseye':'f140','ellipsis-h':'f141','ellipsis-v':'f142','rss-square':'f143','play-circle':'f144','ticket':'f145','minus-square':'f146','minus-square-o':'f147','level-up':'f148','level-down':'f149','check-square':'f14a','pencil-square':'f14b','external-link-square':'f14c','share-square':'f14d','compass':'f14e','toggle-down,caret-square-o-down':'f150','toggle-up,caret-square-o-up':'f151','toggle-right,caret-square-o-right':'f152','euro,eur':'f153','gbp':'f154','dollar,usd':'f155','rupee,inr':'f156','cny,rmb,yen,jpy':'f157','ruble,rouble,rub':'f158','won,krw':'f159','bitcoin,btc':'f15a','file':'f15b','file-text':'f15c','sort-alpha-asc':'f15d','sort-alpha-desc':'f15e','sort-amount-asc':'f160','sort-amount-desc':'f161','sort-numeric-asc':'f162','sort-numeric-desc':'f163','thumbs-up':'f164','thumbs-down':'f165','youtube-square':'f166','youtube':'f167','xing':'f168','xing-square':'f169','youtube-play':'f16a','dropbox':'f16b','stack-overflow':'f16c','instagram':'f16d','flickr':'f16e','adn':'f170','bitbucket':'f171','bitbucket-square':'f172','tumblr':'f173','tumblr-square':'f174','long-arrow-down':'f175','long-arrow-up':'f176','long-arrow-left':'f177','long-arrow-right':'f178','apple':'f179','windows':'f17a','android':'f17b','linux':'f17c','dribbble':'f17d','skype':'f17e','foursquare':'f180','trello':'f181','female':'f182','male':'f183','gittip,gratipay':'f184','sun-o':'f185','moon-o':'f186','archive':'f187','bug':'f188','vk':'f189','weibo':'f18a','renren':'f18b','pagelines':'f18c','stack-exchange':'f18d','arrow-circle-o-right':'f18e','arrow-circle-o-left':'f190','toggle-left,caret-square-o-left':'f191','dot-circle-o':'f192','wheelchair':'f193','vimeo-square':'f194','turkish-lira,try':'f195','plus-square-o':'f196','space-shuttle':'f197','slack':'f198','envelope-square':'f199','wordpress':'f19a','openid':'f19b','institution,bank,university':'f19c','mortar-board,graduation-cap':'f19d','yahoo':'f19e','google':'f1a0','reddit':'f1a1','reddit-square':'f1a2','stumbleupon-circle':'f1a3','stumbleupon':'f1a4','delicious':'f1a5','digg':'f1a6','pied-piper-pp':'f1a7','pied-piper-alt':'f1a8','drupal':'f1a9','joomla':'f1aa','language':'f1ab','fax':'f1ac','building':'f1ad','child':'f1ae','paw':'f1b0','spoon':'f1b1','cube':'f1b2','cubes':'f1b3','behance':'f1b4','behance-square':'f1b5','steam':'f1b6','steam-square':'f1b7','recycle':'f1b8','automobile,car':'f1b9','cab,taxi':'f1ba','tree':'f1bb','spotify':'f1bc','deviantart':'f1bd','soundcloud':'f1be','database':'f1c0','file-pdf-o':'f1c1','file-word-o':'f1c2','file-excel-o':'f1c3','file-powerpoint-o':'f1c4','file-photo-o,file-picture-o,file-image-o':'f1c5','file-zip-o,file-archive-o':'f1c6','file-sound-o,file-audio-o':'f1c7','file-movie-o,file-video-o':'f1c8','file-code-o':'f1c9','vine':'f1ca','codepen':'f1cb','jsfiddle':'f1cc','life-bouy,life-buoy,life-saver,support,life-ring':'f1cd','circle-o-notch':'f1ce','ra,resistance,rebel':'f1d0','ge,empire':'f1d1','git-square':'f1d2','git':'f1d3','y-combinator-square,yc-square,hacker-news':'f1d4','tencent-weibo':'f1d5','qq':'f1d6','wechat,weixin':'f1d7','send,paper-plane':'f1d8','send-o,paper-plane-o':'f1d9','history':'f1da','circle-thin':'f1db','header':'f1dc','paragraph':'f1dd','sliders':'f1de','share-alt':'f1e0','share-alt-square':'f1e1','bomb':'f1e2','soccer-ball-o,futbol-o':'f1e3','tty':'f1e4','binoculars':'f1e5','plug':'f1e6','slideshare':'f1e7','twitch':'f1e8','yelp':'f1e9','newspaper-o':'f1ea','wifi':'f1eb','calculator':'f1ec','paypal':'f1ed','google-wallet':'f1ee','cc-visa':'f1f0','cc-mastercard':'f1f1','cc-discover':'f1f2','cc-amex':'f1f3','cc-paypal':'f1f4','cc-stripe':'f1f5','bell-slash':'f1f6','bell-slash-o':'f1f7','trash':'f1f8','copyright':'f1f9','at':'f1fa','eyedropper':'f1fb','paint-brush':'f1fc','birthday-cake':'f1fd','area-chart':'f1fe','pie-chart':'f200','line-chart':'f201','lastfm':'f202','lastfm-square':'f203','toggle-off':'f204','toggle-on':'f205','bicycle':'f206','bus':'f207','ioxhost':'f208','angellist':'f209','cc':'f20a','shekel,sheqel,ils':'f20b','meanpath':'f20c','buysellads':'f20d','connectdevelop':'f20e','dashcube':'f210','forumbee':'f211','leanpub':'f212','sellsy':'f213','shirtsinbulk':'f214','simplybuilt':'f215','skyatlas':'f216','cart-plus':'f217','cart-arrow-down':'f218','diamond':'f219','ship':'f21a','user-secret':'f21b','motorcycle':'f21c','street-view':'f21d','heartbeat':'f21e','venus':'f221','mars':'f222','mercury':'f223','intersex,transgender':'f224','transgender-alt':'f225','venus-double':'f226','mars-double':'f227','venus-mars':'f228','mars-stroke':'f229','mars-stroke-v':'f22a','mars-stroke-h':'f22b','neuter':'f22c','genderless':'f22d','facebook-official':'f230','pinterest-p':'f231','whatsapp':'f232','server':'f233','user-plus':'f234','user-times':'f235','hotel,bed':'f236','viacoin':'f237','train':'f238','subway':'f239','medium':'f23a','yc,y-combinator':'f23b','optin-monster':'f23c','opencart':'f23d','expeditedssl':'f23e','battery-4,battery-full':'f240','battery-3,battery-three-quarters':'f241','battery-2,battery-half':'f242','battery-1,battery-quarter':'f243','battery-0,battery-empty':'f244','mouse-pointer':'f245','i-cursor':'f246','object-group':'f247','object-ungroup':'f248','sticky-note':'f249','sticky-note-o':'f24a','cc-jcb':'f24b','cc-diners-club':'f24c','clone':'f24d','balance-scale':'f24e','hourglass-o':'f250','hourglass-1,hourglass-start':'f251','hourglass-2,hourglass-half':'f252','hourglass-3,hourglass-end':'f253','hourglass':'f254','hand-grab-o,hand-rock-o':'f255','hand-stop-o,hand-paper-o':'f256','hand-scissors-o':'f257','hand-lizard-o':'f258','hand-spock-o':'f259','hand-pointer-o':'f25a','hand-peace-o':'f25b','trademark':'f25c','registered':'f25d','creative-commons':'f25e','gg':'f260','gg-circle':'f261','tripadvisor':'f262','odnoklassniki':'f263','odnoklassniki-square':'f264','get-pocket':'f265','wikipedia-w':'f266','safari':'f267','chrome':'f268','firefox':'f269','opera':'f26a','internet-explorer':'f26b','tv,television':'f26c','contao':'f26d','500px':'f26e','amazon':'f270','calendar-plus-o':'f271','calendar-minus-o':'f272','calendar-times-o':'f273','calendar-check-o':'f274','industry':'f275','map-pin':'f276','map-signs':'f277','map-o':'f278','map':'f279','commenting':'f27a','commenting-o':'f27b','houzz':'f27c','vimeo':'f27d','black-tie':'f27e','fonticons':'f280','reddit-alien':'f281','edge':'f282','credit-card-alt':'f283','codiepie':'f284','modx':'f285','fort-awesome':'f286','usb':'f287','product-hunt':'f288','mixcloud':'f289','scribd':'f28a','pause-circle':'f28b','pause-circle-o':'f28c','stop-circle':'f28d','stop-circle-o':'f28e','shopping-bag':'f290','shopping-basket':'f291','hashtag':'f292','bluetooth':'f293','bluetooth-b':'f294','percent':'f295','gitlab':'f296','wpbeginner':'f297','wpforms':'f298','envira':'f299','universal-access':'f29a','wheelchair-alt':'f29b','question-circle-o':'f29c','blind':'f29d','audio-description':'f29e','volume-control-phone':'f2a0','braille':'f2a1','assistive-listening-systems':'f2a2','asl-interpreting,american-sign-language-interpreting':'f2a3','deafness,hard-of-hearing,deaf':'f2a4','glide':'f2a5','glide-g':'f2a6','signing,sign-language':'f2a7','low-vision':'f2a8','viadeo':'f2a9','viadeo-square':'f2aa','snapchat':'f2ab','snapchat-ghost':'f2ac','snapchat-square':'f2ad','pied-piper':'f2ae','first-order':'f2b0','yoast':'f2b1','themeisle':'f2b2','google-plus-circle,google-plus-official':'f2b3','fa,font-awesome':'f2b4'};
    }

    function icon(d) {
      var code;

      if (options.iconMap && options.showIcons && options.icons) {
        if (options.icons[d.labels[0]] && options.iconMap[options.icons[d.labels[0]]]) {
          code = options.iconMap[options.icons[d.labels[0]]];
        } else if (options.iconMap[d.labels[0]]) {
          code = options.iconMap[d.labels[0]];
        } else if (options.icons[d.labels[0]]) {
          code = options.icons[d.labels[0]];
        }
      }

      return code;
    }

function image(d) {
  var i, imagesForLabel, img, imgLevel, label, labelPropertyValue, property, value;

  if (options.images) {
    imagesForLabel = options.imageMap[d.labels[0]];

    if (imagesForLabel) {
      imgLevel = 0;

      for (i = 0; i < imagesForLabel.length; i++) {
        labelPropertyValue = imagesForLabel[i].split('|');

        switch (labelPropertyValue.length) {
          case 3:
            value = labelPropertyValue[2];
            /* falls through */
          case 2:
            property = labelPropertyValue[1];
            /* falls through */
          case 1:
            label = labelPropertyValue[0];
        }

        if (d.labels[0] === label &&
          (!property || d.properties[property] !== undefined) &&
          (!value || d.properties[property] === value)) {
          if (labelPropertyValue.length > imgLevel) {
            img = options.images[imagesForLabel[i]];
            imgLevel = labelPropertyValue.length;
          }
        }
      }
    }
  }

  return img;
}

function init(_selector, _options) {
  initIconMap();

  merge(options, _options);

  if (options.icons) {
    options.showIcons = true;
  }

  if (!options.minCollision) {
    options.minCollision = options.nodeRadius * 2;
  }

  initImageMap();

  selector = _selector;

  container = d3.select(selector);

  container.attr('class', 'neo4jd3')
    .html('');

  if (options.infoPanel) {
    info = appendInfoPanel(container);
  }

  appendGraph(container);

  simulation = initSimulation();


  if (options.neo4jData) {
    loadNeo4jData(options.neo4jData);
  } else if (options.neo4jDataUrl) {
    loadNeo4jDataFromUrl(options.neo4jDataUrl);
  } else {
    console.error('Error: both neo4jData and neo4jDataUrl are empty!');
  }
}

function initIconMap() {
  Object.keys(options.iconMap).forEach(function(key, index) {
    var keys = key.split(','),
      value = options.iconMap[key];

    keys.forEach(function(key) {
      options.iconMap[key] = value;
    });
  });
}

function initImageMap() {
  var key, keys, selector;

  for (key in options.images) {
    if (options.images.hasOwnProperty(key)) {
      keys = key.split('|');

      if (!options.imageMap[keys[0]]) {
        options.imageMap[keys[0]] = [key];
      } else {
        options.imageMap[keys[0]].push(key);
      }
    }
  }
}

function initSimulation() {
  var spreadFactor = 1.25;
  var simulation = d3.forceSimulation()
  //.force('x', d3.forceCollide().strength(0.002))
  //.force('y', d3.forceCollide().strength(0.002))
  //.force('y', d3.force().strength(0.002))
    .force('collide', d3.forceCollide().radius(function(d) {
      return options.minCollision * spreadFactor;
    }).iterations(10))
    .force('charge', d3.forceManyBody())
    .force('link', d3.forceLink().id(function(d) {
      return d.id;
    }))
    .force('center', d3.forceCenter(svg.node().parentElement.parentElement.clientWidth / 2, svg.node().parentElement.parentElement.clientHeight / 2))
    .on('tick', function() {
      tick();
    })
    .on('end', function() {
      if (options.zoomFit && !justLoaded) {
        justLoaded = true;
        zoomFit(2);
      }
    });

  return simulation;
}

function loadNeo4jData() {
  nodes = [];
  relationships = [];

  updateWithNeo4jData(options.neo4jData);
}

function loadNeo4jDataFromUrl(neo4jDataUrl) {
  nodes = [];
  relationships = [];

  d3.json(neo4jDataUrl, function(error, data) {
    if (error) {
      throw error;
    }

    updateWithNeo4jData(data);
  });
}

function merge(target, source) {
  Object.keys(source).forEach(function(property) {
    target[property] = source[property];
  });
}

function neo4jDataToD3Data(data) {
  var graph = {
    nodes: [],
    relationships: []
  };

  data.results.forEach(function(result) {
    result.data.forEach(function(data) {
      data.graph.nodes.forEach(function(node) {
        if (!contains(graph.nodes, node.id)) {
          graph.nodes.push(node);
        }
      });

      data.graph.relationships.forEach(function(relationship) {
        relationship.source = relationship.startNode;
        relationship.target = relationship.endNode;
        graph.relationships.push(relationship);
      });

      data.graph.relationships.sort(function(a, b) {
        if (a.source > b.source) {
          return 1;
        } else if (a.source < b.source) {
          return -1;
        } else {
          if (a.target > b.target) {
            return 1;
          }

          if (a.target < b.target) {
            return -1;
          } else {
            return 0;
          }
        }
      });

      for (var i = 0; i < data.graph.relationships.length; i++) {
        if (i !== 0 && data.graph.relationships[i].source === data.graph.relationships[i-1].source && data.graph.relationships[i].target === data.graph.relationships[i-1].target) {
          data.graph.relationships[i].linknum = data.graph.relationships[i - 1].linknum + 1;
        } else {
          data.graph.relationships[i].linknum = 1;
        }
      }
    });
  });

  return graph;
}

function rotate(cx, cy, x, y, angle) {
  var radians = (Math.PI / 180) * angle,
    cos = Math.cos(radians),
    sin = Math.sin(radians),
    nx = (cos * (x - cx)) + (sin * (y - cy)) + cx,
    ny = (cos * (y - cy)) - (sin * (x - cx)) + cy;

  return { x: nx, y: ny };
}

function rotatePoint(c, p, angle) {
  // console.log('rotatePoint', c, p, angle)

  return rotate(c.x, c.y, p.x, p.y, angle);
}

function rotation(source, target) {
  return Math.atan2(target.y - source.y, target.x - source.x) * 180 / Math.PI;
}

function size() {
  return {
    nodes: nodes.length,
    relationships: relationships.length
  };
}
/*
    function smoothTransform(elem, translate, scale) {
        var animationMilliseconds = 5000,
            timeoutMilliseconds = 50,
            steps = parseInt(animationMilliseconds / timeoutMilliseconds);

        setTimeout(function() {
            smoothTransformStep(elem, translate, scale, timeoutMilliseconds, 1, steps);
        }, timeoutMilliseconds);
    }

    function smoothTransformStep(elem, translate, scale, timeoutMilliseconds, step, steps) {
        var progress = step / steps;

        elem.attr('transform', 'translate(' + (translate[0] * progress) + ', ' + (translate[1] * progress) + ') scale(' + (scale * progress) + ')');

        if (step < steps) {
            setTimeout(function() {
                smoothTransformStep(elem, translate, scale, timeoutMilliseconds, step + 1, steps);
            }, timeoutMilliseconds);
        }
    }
    */
function stickNode(d) {
  d.fx = d3.event.x;
  d.fy = d3.event.y;
}

function tick() {
  tickNodes();
  tickRelationships();
}

function tickNodes() {
  if (node) {
    node.attr('transform', function(d) {
      return 'translate(' + d.x + ', ' + d.y + ')';
    });
  }
}

function tickRelationships() {
  if (relationship) {
    relationship.attr('transform', function(d) {
      var angle = rotation(d.source, d.target);
      return 'translate(' + d.source.x + ', ' + d.source.y + ') rotate(' + angle + ')';
    });

    tickRelationshipsTexts();
    tickRelationshipsOutlines();
    tickRelationshipsOverlays();
  }
}

function produceBoundingBox(textNode, relationship){
  return textNode.node().getBBox();
}

function tickRelationshipsOutlines() {
  relationship.each(function(relationship) {

    var rel = d3.select(this);
    var outline = rel.select('.outline');
    var text = rel.select('.text');
    var bbox = text.node().getBBox();
    var padding = 0;


    var textBoundingBox = produceBoundingBox(text, relationship);

    outline.attr('d', function(d) {
      var center = { x: 0, y: 0 },
        angle = rotation(d.source, d.target),
        textPadding = 0,
        u = unitaryVector(d.source, d.target),
        textMargin = { x: (d.target.x - d.source.x - (textBoundingBox.width + textPadding) * u.x) * 0.5, y: (d.target.y - d.source.y - (textBoundingBox.width + textPadding) * u.y) * 0.5 },
        n = unitaryNormalVector(d.source, d.target),
        rotatedPointA1 = rotatePoint(center, { x: 0 + (options.nodeRadius + 1) * u.x - n.x, y: 0 + (options.nodeRadius + 1) * u.y - n.y }, angle),
        rotatedPointB1 = rotatePoint(center, { x: textMargin.x - n.x, y: textMargin.y - n.y }, angle),
        rotatedPointC1 = rotatePoint(center, { x: textMargin.x, y: textMargin.y }, angle),
        rotatedPointD1 = rotatePoint(center, { x: 0 + (options.nodeRadius + 1) * u.x, y: 0 + (options.nodeRadius + 1) * u.y }, angle),
        rotatedPointA2 = rotatePoint(center, { x: d.target.x - d.source.x - textMargin.x - n.x, y: d.target.y - d.source.y - textMargin.y - n.y }, angle),
        rotatedPointB2 = rotatePoint(center, { x: d.target.x - d.source.x - (options.nodeRadius + 1) * u.x - n.x - u.x * options.arrowSize, y: d.target.y - d.source.y - (options.nodeRadius + 1) * u.y - n.y - u.y * options.arrowSize }, angle),
        rotatedPointC2 = rotatePoint(center, { x: d.target.x - d.source.x - (options.nodeRadius + 1) * u.x - n.x + (n.x - u.x) * options.arrowSize, y: d.target.y - d.source.y - (options.nodeRadius + 1) * u.y - n.y + (n.y - u.y) * options.arrowSize }, angle),
        rotatedPointD2 = rotatePoint(center, { x: d.target.x - d.source.x - (options.nodeRadius + 1) * u.x, y: d.target.y - d.source.y - (options.nodeRadius + 1) * u.y }, angle),
        rotatedPointE2 = rotatePoint(center, { x: d.target.x - d.source.x - (options.nodeRadius + 1) * u.x + (- n.x - u.x) * options.arrowSize, y: d.target.y - d.source.y - (options.nodeRadius + 1) * u.y + (- n.y - u.y) * options.arrowSize }, angle),
        rotatedPointF2 = rotatePoint(center, { x: d.target.x - d.source.x - (options.nodeRadius + 1) * u.x - u.x * options.arrowSize, y: d.target.y - d.source.y - (options.nodeRadius + 1) * u.y - u.y * options.arrowSize }, angle),
        rotatedPointG2 = rotatePoint(center, { x: d.target.x - d.source.x - textMargin.x, y: d.target.y - d.source.y - textMargin.y }, angle);

      return 'M ' + rotatedPointA1.x + ' ' + rotatedPointA1.y +
        ' L ' + rotatedPointB1.x + ' ' + rotatedPointB1.y +
        ' L ' + rotatedPointC1.x + ' ' + rotatedPointC1.y +
        ' L ' + rotatedPointD1.x + ' ' + rotatedPointD1.y +
        ' Z M ' + rotatedPointA2.x + ' ' + rotatedPointA2.y +
        ' L ' + rotatedPointB2.x + ' ' + rotatedPointB2.y +
        ' L ' + rotatedPointC2.x + ' ' + rotatedPointC2.y +
        ' L ' + rotatedPointD2.x + ' ' + rotatedPointD2.y +
        ' L ' + rotatedPointE2.x + ' ' + rotatedPointE2.y +
        ' L ' + rotatedPointF2.x + ' ' + rotatedPointF2.y +
        ' L ' + rotatedPointG2.x + ' ' + rotatedPointG2.y +
        ' Z';
    });
  });
}

function tickRelationshipsOverlays() {
  relationshipOverlay.attr('d', function(d) {
    var center = { x: 0, y: 0 },
      angle = rotation(d.source, d.target),
      n1 = unitaryNormalVector(d.source, d.target),
      n = unitaryNormalVector(d.source, d.target, 50),
      rotatedPointA = rotatePoint(center, { x: 0 - n.x, y: 0 - n.y }, angle),
      rotatedPointB = rotatePoint(center, { x: d.target.x - d.source.x - n.x, y: d.target.y - d.source.y - n.y }, angle),
      rotatedPointC = rotatePoint(center, { x: d.target.x - d.source.x + n.x - n1.x, y: d.target.y - d.source.y + n.y - n1.y }, angle),
      rotatedPointD = rotatePoint(center, { x: 0 + n.x - n1.x, y: 0 + n.y - n1.y }, angle);

    return 'M ' + rotatedPointA.x + ' ' + rotatedPointA.y +
      ' L ' + rotatedPointB.x + ' ' + rotatedPointB.y +
      ' L ' + rotatedPointC.x + ' ' + rotatedPointC.y +
      ' L ' + rotatedPointD.x + ' ' + rotatedPointD.y +
      ' Z';
  });
}

function tickRelationshipsTexts() {
  relationshipText.attr('transform', function(d) {
    var angle = (rotation(d.source, d.target) + 360) % 360,
      mirror = angle > 90 && angle < 270,
      center = { x: 0, y: 0 },
      n = unitaryNormalVector(d.source, d.target),
      nWeight = mirror ? 2 : -3,
      point = { x: (d.target.x - d.source.x) * 0.5 + n.x * nWeight, y: (d.target.y - d.source.y) * 0.5 + n.y * nWeight },
      rotatedPoint = rotatePoint(center, point, angle);

    return 'translate(' + rotatedPoint.x + ', ' + rotatedPoint.y + ') rotate(' + (mirror ? 180 : 0) + ')';
  });
}

function toString(d) {
  var s = d.labels ? d.labels[0] : d.type;

  s += ' (<id>: ' + d.id;

  Object.keys(d.properties).forEach(function(property) {
    s += ', ' + property + ': ' + JSON.stringify(d.properties[property]);
  });

  s += ')';

  return s;
}

function unitaryNormalVector(source, target, newLength) {
  var center = { x: 0, y: 0 },
    vector = unitaryVector(source, target, newLength);

  return rotatePoint(center, vector, 90);
}

function unitaryVector(source, target, newLength) {
  var length = Math.sqrt(Math.pow(target.x - source.x, 2) + Math.pow(target.y - source.y, 2)) / Math.sqrt(newLength || 1);

  return {
    x: (target.x - source.x) / length,
    y: (target.y - source.y) / length,
  };
}

function updateWithD3Data(d3Data) {
  // marker
  updateNodesAndRelationships(d3Data.nodes, d3Data.relationships);
}

function updateWithNeo4jData(neo4jData) {
  var d3Data = neo4jDataToD3Data(neo4jData);
  updateWithD3Data(d3Data);
}

function updateInfo(d) {
  clearInfo();

  if (d.labels) {
    appendInfoElementClass('class', d.labels[0]);
  } else {
    appendInfoElementRelationship('class', d.type);
  }

  appendInfoElementProperty('property', '&lt;id&gt;', d.id);

  Object.keys(d.properties).forEach(function(property) {
    appendInfoElementProperty('property', property, JSON.stringify(d.properties[property]));
  });
}

function updateNodes(n) {
  Array.prototype.push.apply(nodes, n);

  node = svgNodes.selectAll('.node')
    .data(nodes, function(d) { return d.id; });
  var nodeEnter = appendNodeToGraph();
  node = nodeEnter.merge(node);
}

function updateNodesAndRelationships(n, r) {
  updateRelationships(r);
  updateNodes(n);

  simulation.nodes(nodes);
  simulation.force('link').links(relationships);
}

function updateRelationships(r) {
  Array.prototype.push.apply(relationships, r);

  relationship = svgRelationships.selectAll('.relationship')
    .data(relationships, function(d) { return d.id; });

  var relationshipEnter = appendRelationshipToGraph();

  relationship = relationshipEnter.relationship.merge(relationship);
  relationshipOutline = svg.selectAll('.relationship .outline');
  relationshipOutline = relationshipEnter.outline.merge(relationshipOutline);

  relationshipOverlay = svg.selectAll('.relationship .overlay');
  relationshipOverlay = relationshipEnter.overlay.merge(relationshipOverlay);

  relationshipText = svg.selectAll('.relationship .text');
  relationshipText = relationshipEnter.text.merge(relationshipText);
}


function version() {
  return VERSION;
}

function zoomFit(transitionDuration) {
  var bounds = svg.node().getBBox();
  var parent = svg.node().parentElement.parentElement;

  if (!parent) {
    return;
  }

  var fullWidth = parent.clientWidth;
  var fullHeight = parent.clientHeight;
  var width = bounds.width;
  var height = bounds.height;
  var midX = bounds.x + width / 2;
  var midY = bounds.y + height / 2;

  if (width === 0 || height === 0) {
    return; // nothing to fit
  }

  svgScale = 0.85 / Math.max(width / fullWidth, height / fullHeight);
  svgTranslate = [fullWidth / 2 - svgScale * midX, fullHeight / 2 - svgScale * midY];

  svg.attr('transform', 'translate(' + svgTranslate[0] + ', ' + svgTranslate[1] + ') scale(' + svgScale + ')');
  //        smoothTransform(svgTranslate, svgScale);
}

init(_selector, _options);

return {
  neo4jDataToD3Data: neo4jDataToD3Data,
  size: size,
  updateWithD3Data: updateWithD3Data,
  updateWithNeo4jData: updateWithNeo4jData,
  version: version
};
}

module.exports = Neo4jD3;

},{}]},{},[1])(1)
});

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvbWFpbi9pbmRleC5qcyIsInNyYy9tYWluL3NjcmlwdHMvbmVvNGpkMy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIid1c2Ugc3RyaWN0JztcclxuXHJcbnZhciBuZW80amQzID0gcmVxdWlyZSgnLi9zY3JpcHRzL25lbzRqZDMnKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gbmVvNGpkMztcclxuIiwiLyogZ2xvYmFsIGQzLCBkb2N1bWVudCAqL1xyXG4vKiBqc2hpbnQgbGF0ZWRlZjpub2Z1bmMgKi9cclxuJ3VzZSBzdHJpY3QnO1xyXG5cclxuZnVuY3Rpb24gTmVvNGpEMyhfc2VsZWN0b3IsIF9vcHRpb25zKSB7XHJcbiAgdmFyIGNvbnRhaW5lciwgZ3JhcGgsIGluZm8sIG5vZGUsIG5vZGVzLCByZWxhdGlvbnNoaXAsIHJlbGF0aW9uc2hpcE91dGxpbmUsIHJlbGF0aW9uc2hpcE92ZXJsYXksIHJlbGF0aW9uc2hpcFRleHQsIHJlbGF0aW9uc2hpcHMsIHNlbGVjdG9yLCBzaW11bGF0aW9uLCBzdmcsIHN2Z05vZGVzLCBzdmdSZWxhdGlvbnNoaXBzLCBzdmdTY2FsZSwgc3ZnVHJhbnNsYXRlLFxyXG4gICAgY2xhc3NlczJjb2xvcnMgPSB7fSxcclxuICAgIGp1c3RMb2FkZWQgPSBmYWxzZSxcclxuICAgIG51bUNsYXNzZXMgPSAwLFxyXG4gICAgb3B0aW9ucyA9IHtcclxuICAgICAgYXJyb3dTaXplOiAyLFxyXG4gICAgICBjb2xvcnM6IGNvbG9ycygpLFxyXG4gICAgICBoaWdobGlnaHQ6IHVuZGVmaW5lZCxcclxuICAgICAgaWNvbk1hcDogZm9udEF3ZXNvbWVJY29ucygpLFxyXG4gICAgICBpY29uczogdW5kZWZpbmVkLFxyXG4gICAgICBpbWFnZU1hcDoge30sXHJcbiAgICAgIGltYWdlczogdW5kZWZpbmVkLFxyXG4gICAgICBpbmZvUGFuZWw6IHRydWUsXHJcbiAgICAgIG1pbkNvbGxpc2lvbjogdW5kZWZpbmVkLFxyXG4gICAgICBuZW80akRhdGE6IHVuZGVmaW5lZCxcclxuICAgICAgbmVvNGpEYXRhVXJsOiB1bmRlZmluZWQsXHJcbiAgICAgIG5vZGVPdXRsaW5lRmlsbENvbG9yOiB1bmRlZmluZWQsXHJcbiAgICAgIG5vZGVSYWRpdXM6IDc1LFxyXG4gICAgICByZWxhdGlvbnNoaXBDb2xvcjogJyNhNWFiYjYnLFxyXG4gICAgICB6b29tRml0OiBmYWxzZSxcclxuICAgICAgbGFiZWxDb2xvck1hcHBpbmc6IGNyZWF0ZUxhYmVsQ29sb3JNYXBwaW5nKCksXHJcbiAgICAgIGxhYmVsUHJvcGVydHk6ICduYW1lJyxcclxuICAgICAgaW1hZ2VTaXplOiB7XHJcbiAgICAgICAgaGVpZ2h0OiAnMzBweCcsXHJcbiAgICAgICAgd2lkdGg6ICczMHB4JyxcclxuICAgICAgICB4OiAnLTE1cHgnLFxyXG4gICAgICAgIHk6ICctMTZweCcsXHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICBWRVJTSU9OID0gJzAuMC4xJztcclxuXHJcbiAgZnVuY3Rpb24gY3JlYXRlTGFiZWxDb2xvck1hcHBpbmcoKXtcclxuICAgIHZhciBsYWJlbENvbG9yTWFwcGluZyA9IHtcclxuICAgICAgXCJjdXN0b21lclwiOiBcIiM2OGJkZjZcIixcclxuICAgICAgXCJhY2NvdW50XCI6IFwiI2ZmZDg2ZVwiLFxyXG4gICAgICBcIm93bmJhbmthY2NvdW50XCI6IFwiIzZkY2U5ZVwiLFxyXG4gICAgICBcIm90aGVyYmFua2FjY291bnRcIjogXCIjZmY4NjdmXCIsXHJcbiAgICAgIFwicnVsZXZpb2xhdGlvblwiOiBcIiNmZmE4MmRcIlxyXG4gICAgfTtcclxuXHJcbiAgICByZXR1cm4gbGFiZWxDb2xvck1hcHBpbmc7XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBhcHBlbmRHcmFwaChjb250YWluZXIpIHtcclxuICAgIHN2ZyA9IGNvbnRhaW5lci5hcHBlbmQoJ3N2ZycpXHJcbiAgICAgIC5hdHRyKCd3aWR0aCcsICcxMDAlJylcclxuICAgICAgLmF0dHIoJ2hlaWdodCcsICcxMDAlJylcclxuICAgICAgLmF0dHIoJ2NsYXNzJywgJ25lbzRqZDMtZ3JhcGgnKVxyXG4gICAgICAuY2FsbChkMy56b29tKCkub24oJ3pvb20nLCBmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgc2NhbGUgPSBkMy5ldmVudC50cmFuc2Zvcm0uayxcclxuICAgICAgICAgIHRyYW5zbGF0ZSA9IFtkMy5ldmVudC50cmFuc2Zvcm0ueCwgZDMuZXZlbnQudHJhbnNmb3JtLnldO1xyXG5cclxuICAgICAgICBpZiAoc3ZnVHJhbnNsYXRlKSB7XHJcbiAgICAgICAgICB0cmFuc2xhdGVbMF0gKz0gc3ZnVHJhbnNsYXRlWzBdO1xyXG4gICAgICAgICAgdHJhbnNsYXRlWzFdICs9IHN2Z1RyYW5zbGF0ZVsxXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChzdmdTY2FsZSkge1xyXG4gICAgICAgICAgc2NhbGUgKj0gc3ZnU2NhbGU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzdmcuYXR0cigndHJhbnNmb3JtJywgJ3RyYW5zbGF0ZSgnICsgdHJhbnNsYXRlWzBdICsgJywgJyArIHRyYW5zbGF0ZVsxXSArICcpIHNjYWxlKCcgKyBzY2FsZSArICcpJyk7XHJcbiAgICAgIH0pKVxyXG4gICAgICAub24oJ2RibGNsaWNrLnpvb20nLCBudWxsKVxyXG4gICAgICAuYXBwZW5kKCdnJylcclxuICAgICAgLmF0dHIoJ3dpZHRoJywgJzEwMCUnKVxyXG4gICAgICAuYXR0cignaGVpZ2h0JywgJzEwMCUnKTtcclxuXHJcbiAgICBzdmdSZWxhdGlvbnNoaXBzID0gc3ZnLmFwcGVuZCgnZycpXHJcbiAgICAgIC5hdHRyKCdjbGFzcycsICdyZWxhdGlvbnNoaXBzJyk7XHJcblxyXG4gICAgc3ZnTm9kZXMgPSBzdmcuYXBwZW5kKCdnJylcclxuICAgICAgLmF0dHIoJ2NsYXNzJywgJ25vZGVzJyk7XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBhcHBlbmRJbWFnZVRvTm9kZShub2RlKSB7XHJcbiAgICByZXR1cm4gbm9kZS5hcHBlbmQoJ2ltYWdlJylcclxuICAgICAgLmF0dHIoJ2hlaWdodCcsIGZ1bmN0aW9uKGQpIHtcclxuICAgICAgICByZXR1cm4gaWNvbihkKSA/ICcyNHB4Jzogb3B0aW9ucy5pbWFnZVNpemUuaGVpZ2h0O1xyXG4gICAgICB9KVxyXG4gICAgICAuYXR0cigneCcsIGZ1bmN0aW9uKGQpIHtcclxuICAgICAgICByZXR1cm4gaWNvbihkKSA/ICc1cHgnOiBvcHRpb25zLmltYWdlU2l6ZS54O1xyXG4gICAgICB9KVxyXG4gICAgICAuYXR0cigneGxpbms6aHJlZicsIGZ1bmN0aW9uKGQpIHtcclxuICAgICAgICByZXR1cm4gaW1hZ2UoZCk7XHJcbiAgICAgIH0pXHJcbiAgICAgIC5hdHRyKCd5JywgZnVuY3Rpb24oZCkge1xyXG4gICAgICAgIHJldHVybiBpY29uKGQpID8gJzVweCc6IG9wdGlvbnMuaW1hZ2VTaXplLnk7XHJcbiAgICAgIH0pXHJcbiAgICAgIC5hdHRyKCd3aWR0aCcsIGZ1bmN0aW9uKGQpIHtcclxuICAgICAgICByZXR1cm4gaWNvbihkKSA/ICcyNHB4Jzogb3B0aW9ucy5pbWFnZVNpemUud2lkdGg7XHJcbiAgICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gYXBwZW5kSW5mb1BhbmVsKGNvbnRhaW5lcikge1xyXG4gICAgcmV0dXJuIGNvbnRhaW5lci5hcHBlbmQoJ2RpdicpXHJcbiAgICAgIC5hdHRyKCdjbGFzcycsICduZW80amQzLWluZm8nKTtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGFwcGVuZEluZm9FbGVtZW50KGNscywgaXNOb2RlLCBwcm9wZXJ0eSwgdmFsdWUpIHtcclxuICAgIHZhciBlbGVtID0gaW5mby5hcHBlbmQoJ2EnKTtcclxuXHJcbiAgICBlbGVtLmF0dHIoJ2hyZWYnLCAnIycpXHJcbiAgICAgIC5hdHRyKCdjbGFzcycsIGNscylcclxuICAgICAgLmh0bWwoJzxzdHJvbmc+JyArIHByb3BlcnR5ICsgJzwvc3Ryb25nPicgKyAodmFsdWUgPyAoJzogJyArIHZhbHVlKSA6ICcnKSk7XHJcbiAgICBpZiAoIXZhbHVlKSB7XHJcbiAgICAgIGVsZW0uc3R5bGUoJ2JhY2tncm91bmQtY29sb3InLCBmdW5jdGlvbihkKSB7XHJcbiAgICAgICAgICB2YXIgdGhlUHJvcGVydHkgPSBwcm9wZXJ0eS50b0xvd2VyQ2FzZSgpO1xyXG5cclxuICAgICAgICAgIGlmICh0aGVQcm9wZXJ0eSBpbiBvcHRpb25zLmxhYmVsQ29sb3JNYXBwaW5nKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBvcHRpb25zLmxhYmVsQ29sb3JNYXBwaW5nW3RoZVByb3BlcnR5XTtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIG9wdGlvbnMubm9kZU91dGxpbmVGaWxsQ29sb3IgPyBvcHRpb25zLm5vZGVPdXRsaW5lRmlsbENvbG9yIDogKGlzTm9kZSA/IGNsYXNzMmNvbG9yKHByb3BlcnR5KSA6IGRlZmF1bHRDb2xvcigpKTtcclxuICAgICAgfSlcclxuICAgICAgICAuc3R5bGUoJ2JvcmRlci1jb2xvcicsIGZ1bmN0aW9uKGQpIHtcclxuICAgICAgICAgIHZhciB0aGVQcm9wZXJ0eSA9IHByb3BlcnR5LnRvTG93ZXJDYXNlKCk7XHJcblxyXG4gICAgICAgICAgaWYgKHRoZVByb3BlcnR5IGluIG9wdGlvbnMubGFiZWxDb2xvck1hcHBpbmcpe1xyXG4gICAgICAgICAgICByZXR1cm4gb3B0aW9ucy5sYWJlbENvbG9yTWFwcGluZ1t0aGVQcm9wZXJ0eV07XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICByZXR1cm4gb3B0aW9ucy5ub2RlT3V0bGluZUZpbGxDb2xvciA/IGNsYXNzMmRhcmtlbkNvbG9yKG9wdGlvbnMubm9kZU91dGxpbmVGaWxsQ29sb3IpIDogKGlzTm9kZSA/IGNsYXNzMmRhcmtlbkNvbG9yKHByb3BlcnR5KSA6IGRlZmF1bHREYXJrZW5Db2xvcigpKTtcclxuICAgICAgICB9KVxyXG4gICAgICAgIC5zdHlsZSgnY29sb3InLCBmdW5jdGlvbihkKSB7XHJcbiAgICAgICAgICByZXR1cm4gb3B0aW9ucy5ub2RlT3V0bGluZUZpbGxDb2xvciA/IGNsYXNzMmRhcmtlbkNvbG9yKG9wdGlvbnMubm9kZU91dGxpbmVGaWxsQ29sb3IpIDogJyNmZmYnO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gYXBwZW5kSW5mb0VsZW1lbnRDbGFzcyhjbHMsIG5vZGUpIHtcclxuICAgIGFwcGVuZEluZm9FbGVtZW50KGNscywgdHJ1ZSwgbm9kZSk7XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBhcHBlbmRJbmZvRWxlbWVudFByb3BlcnR5KGNscywgcHJvcGVydHksIHZhbHVlKSB7XHJcbiAgICBhcHBlbmRJbmZvRWxlbWVudChjbHMsIGZhbHNlLCBwcm9wZXJ0eSwgdmFsdWUpO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gYXBwZW5kSW5mb0VsZW1lbnRSZWxhdGlvbnNoaXAoY2xzLCByZWxhdGlvbnNoaXApIHtcclxuICAgIGFwcGVuZEluZm9FbGVtZW50KGNscywgZmFsc2UsIHJlbGF0aW9uc2hpcCk7XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBhcHBlbmROb2RlKCkge1xyXG4gICAgcmV0dXJuIG5vZGUuZW50ZXIoKVxyXG4gICAgICAuYXBwZW5kKCdnJylcclxuICAgICAgLmF0dHIoJ2NsYXNzJywgZnVuY3Rpb24oZCkge1xyXG4gICAgICAgIHZhciBoaWdobGlnaHQsIGksXHJcbiAgICAgICAgICBjbGFzc2VzID0gJ25vZGUnLFxyXG4gICAgICAgICAgbGFiZWwgPSBkLmxhYmVsc1swXTtcclxuXHJcbiAgICAgICAgaWYgKGljb24oZCkpIHtcclxuICAgICAgICAgIGNsYXNzZXMgKz0gJyBub2RlLWljb24nO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGltYWdlKGQpKSB7XHJcbiAgICAgICAgICBjbGFzc2VzICs9ICcgbm9kZS1pbWFnZSc7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAob3B0aW9ucy5oaWdobGlnaHQpIHtcclxuICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBvcHRpb25zLmhpZ2hsaWdodC5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBoaWdobGlnaHQgPSBvcHRpb25zLmhpZ2hsaWdodFtpXTtcclxuXHJcbiAgICAgICAgICAgIGlmIChkLmxhYmVsc1swXSA9PT0gaGlnaGxpZ2h0LmNsYXNzICYmIGQucHJvcGVydGllc1toaWdobGlnaHQucHJvcGVydHldID09PSBoaWdobGlnaHQudmFsdWUpIHtcclxuICAgICAgICAgICAgICBjbGFzc2VzICs9ICcgbm9kZS1oaWdobGlnaHRlZCc7XHJcbiAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBjbGFzc2VzO1xyXG4gICAgICB9KVxyXG4gICAgICAub24oJ2NsaWNrJywgZnVuY3Rpb24oZCkge1xyXG4gICAgICAgIGQuZnggPSBkLmZ5ID0gbnVsbDtcclxuXHJcbiAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLm9uTm9kZUNsaWNrID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICBvcHRpb25zLm9uTm9kZUNsaWNrKGQpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSlcclxuICAgICAgLm9uKCdkYmxjbGljaycsIGZ1bmN0aW9uKGQpIHtcclxuICAgICAgICBzdGlja05vZGUoZCk7XHJcblxyXG4gICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5vbk5vZGVEb3VibGVDbGljayA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgb3B0aW9ucy5vbk5vZGVEb3VibGVDbGljayhkKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0pXHJcbiAgICAgIC5vbignbW91c2VlbnRlcicsIGZ1bmN0aW9uKGQpIHtcclxuICAgICAgICBpZiAoaW5mbykge1xyXG4gICAgICAgICAgdXBkYXRlSW5mbyhkKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5vbk5vZGVNb3VzZUVudGVyID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICBvcHRpb25zLm9uTm9kZU1vdXNlRW50ZXIoZCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KVxyXG4gICAgICAub24oJ21vdXNlbGVhdmUnLCBmdW5jdGlvbihkKSB7XHJcbiAgICAgICAgaWYgKGluZm8pIHtcclxuICAgICAgICAgIGNsZWFySW5mbyhkKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5vbk5vZGVNb3VzZUxlYXZlID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICBvcHRpb25zLm9uTm9kZU1vdXNlTGVhdmUoZCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KVxyXG5cclxuICAgIC5jYWxsKGQzLmRyYWcoKVxyXG4gICAgLm9uKCdzdGFydCcsIGRyYWdTdGFydGVkKVxyXG4gICAgLm9uKCdkcmFnJywgZHJhZ2dlZClcclxuICAgIC5vbignZW5kJywgZHJhZ0VuZGVkKSk7XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiB0cnVuY2F0ZVRleHQoc3RyLCBsZW5ndGgpIHtcclxuICAgIHN0ciA9IHN0ciB8fCAnJztcclxuXHJcbiAgICB2YXIgZW5kaW5nID0gJy4uLic7XHJcblxyXG4gICAgaWYgKGxlbmd0aCA9PSBudWxsKSB7XHJcbiAgICAgIGxlbmd0aCA9IDEwMDtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoc3RyLmxlbmd0aCA+IGxlbmd0aCkge1xyXG4gICAgICByZXR1cm4gc3RyLnN1YnN0cmluZygwLCBsZW5ndGggLSBlbmRpbmcubGVuZ3RoKSArIGVuZGluZztcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHJldHVybiBzdHI7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBjYWxjdWxhdGVYTG9jYXRpb24obmFtZSkge1xyXG4gICAgcmV0dXJuIG5hbWUubGVuZ3RoO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gYXBwZW5kTm9kZU5hbWVUZXh0KG5vZGUpIHtcclxuICAgIC8vIGdvaW5nIHRvIG5lZWQgdG8gbGluayB0aGlzIHRvIG5vZGUgd2lkdGgvIGhpZWdodCBhdCBzb21lIHBvaW50XHJcbiAgICB2YXIgZyA9IG5vZGUuYXBwZW5kKCdnJyk7XHJcblxyXG4gICAgZy5hcHBlbmQoXCJyZWN0XCIpXHJcbiAgICAgIC5hdHRyKFwid2lkdGhcIiwgJzgwcHgnKVxyXG4gICAgICAuYXR0cihcImhlaWdodFwiLCAnMjBweCcpXHJcbiAgICAgIC5zdHlsZShcImZpbGxcIiwgZnVuY3Rpb24oZCl7XHJcbiAgICAgICAgcmV0dXJuIFwiIzAwMDAwMFwiO1xyXG4gICAgICB9KVxyXG4gICAgICAuYXR0cigneScsIDI0KVxyXG4gICAgICAuYXR0cigneCcsIC00MClcclxuICAgICAgLmF0dHIoJ3J4JywgMTApXHJcbiAgICAgIC5hdHRyKCdyeScsIDEwKTtcclxuXHJcbiAgICBnLmFwcGVuZCgndGV4dCcpXHJcbiAgICAgIC50ZXh0KGZ1bmN0aW9uKG5vZGUpIHtcclxuICAgICAgICB2YXIgeCA9IG5vZGUubGFiZWxzO1xyXG4gICAgICAgIHJldHVybiB0cnVuY2F0ZVRleHQobm9kZS5wcm9wZXJ0aWVzW29wdGlvbnMubGFiZWxQcm9wZXJ0eV0sIDEzKTtcclxuICAgICAgfSlcclxuICAgICAgLmF0dHIoJ2ZvbnQtc2l6ZScsIDEwKVxyXG4gICAgICAuYXR0cignY29sb3InLCAnI2JkYzNjNycpXHJcbiAgICAgIC5hdHRyKCd4JywgZnVuY3Rpb24obm9kZSl7XHJcbiAgICAgICAgcmV0dXJuIDA7XHJcbiAgICAgICAgLy9yZXR1cm4gY2FsY3VsYXRlWExvY2F0aW9uKG5vZGUucHJvcGVydGllcy5uYW1lKTtcclxuICAgICAgfSlcclxuICAgICAgLmF0dHIoJ3knLCAzMylcclxuICAgICAgLmF0dHIoJ3RleHQtYW5jaG9yJywgJ21pZGRsZScpXHJcbiAgICAgIC5hdHRyKCdhbGlnbm1lbnQtYmFzZWxpbmUnLCAnY2VudHJhbCcpXHJcbiAgICAgIC5vbignY2xpY2snLCBmdW5jdGlvbihkKSB7XHJcbiAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLm9uTm9kZVRleHRDbGljayA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgb3B0aW9ucy5vbk5vZGVUZXh0Q2xpY2soZCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGFwcGVuZE5vZGVJbmZvKG5vZGUpIHtcclxuICAgIGlmICghb3B0aW9ucy5vbk5vZGVJbmZvQ2xpY2sgfHwgIW9wdGlvbnMuZGlzcGxheUluZm9JY29uKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgZyA9IG5vZGUuYXBwZW5kKCdnJylcclxuICAgICAgLmF0dHIoJ2NsYXNzJywgJ2luZm8nKVxyXG4gICAgICAuYXR0cigndHJhbnNmb3JtJywgJ3RyYW5zbGF0ZSg5LCAtMjgpJylcclxuICAgICAgLmF0dHIoXCJ2aXNpYmlsaXR5XCIsIGZ1bmN0aW9uKGQpIHtcclxuICAgICAgICByZXR1cm4gb3B0aW9ucy5kaXNwbGF5SW5mb0ljb24oZCkgPyBcIlwiIDogXCJoaWRkZW5cIjtcclxuICAgICAgfSlcclxuICAgICAgLm9uKCdjbGljaycsIGZ1bmN0aW9uKGQpIHtcclxuICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMub25Ob2RlSW5mb0NsaWNrID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICBvcHRpb25zLm9uTm9kZUluZm9DbGljayhkKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG5cclxuICAgIGcuYXBwZW5kKCdyZWN0JylcclxuICAgICAgLmF0dHIoJ3dpZHRoJywgJzIwcHgnKVxyXG4gICAgICAuYXR0cignaGVpZ2h0JywgJzIwcHgnKVxyXG4gICAgICAuc3R5bGUoJ2ZpbGwnLCAnIzU0YjNmZicpXHJcbiAgICAgIC5zdHlsZSgnc3Ryb2tlJywgJyM1NGIzZmYnKVxyXG4gICAgICAuYXR0cigncngnLCAxMClcclxuICAgICAgLmF0dHIoJ3J5JywgMTApO1xyXG4gICAgXHJcbiAgICBnLmFwcGVuZCgndGV4dCcpXHJcbiAgICAgIC50ZXh0KCdpJylcclxuICAgICAgLmF0dHIoJ2ZpbGwnLCAnd2hpdGUnKVxyXG4gICAgICAuYXR0cignZm9udC1zaXplJywgMTEpXHJcbiAgICAgIC5hdHRyKCd4JywgJzknKVxyXG4gICAgICAuYXR0cigneScsICcxNCcpO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gYXBwZW5kTm9kZVRvR3JhcGgoKSB7XHJcbiAgICB2YXIgbiA9IGFwcGVuZE5vZGUoKTtcclxuXHJcbiAgICBhcHBlbmRSaW5nVG9Ob2RlKG4pO1xyXG4gICAgYXBwZW5kT3V0bGluZVRvTm9kZShuKTtcclxuXHJcbiAgICBpZiAob3B0aW9ucy5pY29ucykge1xyXG4gICAgICBhcHBlbmRUZXh0VG9Ob2RlKG4pO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChvcHRpb25zLmltYWdlcykge1xyXG4gICAgICBhcHBlbmRJbWFnZVRvTm9kZShuKTtcclxuICAgIH1cclxuXHJcbiAgICBhcHBlbmROb2RlTmFtZVRleHQobik7XHJcbiAgICBhcHBlbmROb2RlSW5mbyhuKTtcclxuXHJcbiAgICByZXR1cm4gbjtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGFwcGVuZE91dGxpbmVUb05vZGUobm9kZSkge1xyXG4gICAgcmV0dXJuIG5vZGUuYXBwZW5kKCdjaXJjbGUnKVxyXG4gICAgICAuYXR0cignY2xhc3MnLCAnb3V0bGluZScpXHJcbiAgICAgIC5hdHRyKCdyJywgb3B0aW9ucy5ub2RlUmFkaXVzKVxyXG4gICAgICAuc3R5bGUoJ2ZpbGwnLCBmdW5jdGlvbihkKSB7XHJcbiAgICAgICAgdmFyIGxhYmVsID0gZC5sYWJlbHM7XHJcblxyXG4gICAgICAgIGlmIChsYWJlbC5sZW5ndGggPT09IDApe1xyXG4gICAgICAgICAgcmV0dXJuICdncmF5JztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciB0aGVfbGFiZWwgPSBsYWJlbFswXS50b0xvd2VyQ2FzZSgpO1xyXG4gICAgICAgIGlmICh0aGVfbGFiZWwgaW4gb3B0aW9ucy5sYWJlbENvbG9yTWFwcGluZyl7XHJcbiAgICAgICAgICByZXR1cm4gb3B0aW9ucy5sYWJlbENvbG9yTWFwcGluZ1t0aGVfbGFiZWxdO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIG9wdGlvbnMubm9kZU91dGxpbmVGaWxsQ29sb3IgPyBvcHRpb25zLm5vZGVPdXRsaW5lRmlsbENvbG9yIDogY2xhc3MyY29sb3IoZC5sYWJlbHNbMF0pO1xyXG4gICAgICB9KVxyXG4gICAgICAuc3R5bGUoJ3N0cm9rZScsIGZ1bmN0aW9uKGQpIHtcclxuICAgICAgICB2YXIgbGFiZWwgPSBkLmxhYmVscztcclxuXHJcbiAgICAgICAgaWYgKGxhYmVsLmxlbmd0aCA9PT0gMCl7XHJcbiAgICAgICAgICByZXR1cm4gJ2dyYXknO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdmFyIHRoZV9sYWJlbCA9IGxhYmVsWzBdLnRvTG93ZXJDYXNlKCk7XHJcbiAgICAgICAgaWYgKHRoZV9sYWJlbCBpbiBvcHRpb25zLmxhYmVsQ29sb3JNYXBwaW5nKXtcclxuICAgICAgICAgIHJldHVybiBvcHRpb25zLmxhYmVsQ29sb3JNYXBwaW5nW3RoZV9sYWJlbF07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBvcHRpb25zLm5vZGVPdXRsaW5lRmlsbENvbG9yID8gY2xhc3MyZGFya2VuQ29sb3Iob3B0aW9ucy5ub2RlT3V0bGluZUZpbGxDb2xvcikgOiBjbGFzczJkYXJrZW5Db2xvcihkLmxhYmVsc1swXSk7XHJcbiAgICAgIH0pXHJcbiAgICAgIC5hcHBlbmQoJ3RpdGxlJykudGV4dChmdW5jdGlvbihkKSB7XHJcbiAgICAgICAgcmV0dXJuIHRvU3RyaW5nKGQpO1xyXG4gICAgICB9KTtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGFwcGVuZFJpbmdUb05vZGUobm9kZSkge1xyXG4gICAgcmV0dXJuIG5vZGUuYXBwZW5kKCdjaXJjbGUnKVxyXG4gICAgICAuYXR0cignY2xhc3MnLCAncmluZycpXHJcbiAgICAgIC5hdHRyKCdyJywgb3B0aW9ucy5ub2RlUmFkaXVzICogMS4xNilcclxuICAgICAgLmFwcGVuZCgndGl0bGUnKS50ZXh0KGZ1bmN0aW9uKGQpIHtcclxuICAgICAgICByZXR1cm4gdG9TdHJpbmcoZCk7XHJcbiAgICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gYXBwZW5kVGV4dFRvTm9kZShub2RlKSB7XHJcbiAgICByZXR1cm4gbm9kZS5hcHBlbmQoJ3RleHQnKVxyXG4gICAgICAuYXR0cignY2xhc3MnLCBmdW5jdGlvbihkKSB7XHJcbiAgICAgICAgcmV0dXJuICd0ZXh0JyArIChpY29uKGQpID8gJyBpY29uJyA6ICcnKTtcclxuICAgICAgfSlcclxuICAgICAgLmF0dHIoJ2ZpbGwnLCAnI2ZmZmZmZicpXHJcbiAgICAgIC5hdHRyKCdmb250LXNpemUnLCBmdW5jdGlvbihkKSB7XHJcbiAgICAgICAgcmV0dXJuIGljb24oZCkgPyAob3B0aW9ucy5ub2RlUmFkaXVzICsgJ3B4JykgOiAnMTBweCc7XHJcbiAgICAgIH0pXHJcbiAgICAgIC5hdHRyKCdwb2ludGVyLWV2ZW50cycsICdub25lJylcclxuICAgICAgLmF0dHIoJ3RleHQtYW5jaG9yJywgJ21pZGRsZScpXHJcbiAgICAgIC5hdHRyKCd5JywgZnVuY3Rpb24oZCkge1xyXG4gICAgICAgIHJldHVybiBpY29uKGQpID8gKHBhcnNlSW50KE1hdGgucm91bmQob3B0aW9ucy5ub2RlUmFkaXVzICogMC4zMikpICsgJ3B4JykgOiAnNHB4JztcclxuICAgICAgfSlcclxuICAgICAgLmh0bWwoZnVuY3Rpb24oZCkge1xyXG4gICAgICAgIHZhciBfaWNvbiA9IGljb24oZCk7XHJcbiAgICAgICAgcmV0dXJuIF9pY29uID8gJyYjeCcgKyBfaWNvbiA6IGQuaWQ7XHJcbiAgICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gYXBwZW5kUmVsYXRpb25zaGlwKCkge1xyXG4gICAgcmV0dXJuIHJlbGF0aW9uc2hpcC5lbnRlcigpXHJcbiAgICAgIC5hcHBlbmQoJ2cnKVxyXG4gICAgICAuYXR0cignY2xhc3MnLCdyZWxhdGlvbnNoaXAnKVxyXG4gICAgICAub24oJ2RibGNsaWNrJywgZnVuY3Rpb24oZCkge1xyXG4gICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5vblJlbGF0aW9uc2hpcERvdWJsZUNsaWNrID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICBvcHRpb25zLm9uUmVsYXRpb25zaGlwRG91YmxlQ2xpY2soZCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KVxyXG4gICAgICAub24oJ21vdXNlZW50ZXInLCBmdW5jdGlvbihkKSB7XHJcbiAgICAgICAgaWYgKGluZm8pIHtcclxuICAgICAgICAgIHVwZGF0ZUluZm8oZCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGFwcGVuZE91dGxpbmVUb1JlbGF0aW9uc2hpcChyKSB7XHJcbiAgICByZXR1cm4gci5hcHBlbmQoJ3BhdGgnKVxyXG4gICAgICAuYXR0cignY2xhc3MnLCAnb3V0bGluZScpXHJcbiAgICAgIC5hdHRyKCdmaWxsJywgJyNhNWFiYjYnKVxyXG4gICAgICAuYXR0cignc3Ryb2tlLXdpZHRoJywgZnVuY3Rpb24oZCxpKXtcclxuICAgICAgICByZXR1cm4gMTtcclxuICAgICAgfSlcclxuICAgICAgLmF0dHIoJ3N0cm9rZScsIGZ1bmN0aW9uKGQpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgcmV0dXJuICcjYTVhYmI2JztcclxuICAgICAgICB9KTtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGFwcGVuZE92ZXJsYXlUb1JlbGF0aW9uc2hpcChyKSB7XHJcbiAgICByZXR1cm4gci5hcHBlbmQoJ3BhdGgnKVxyXG4gICAgICAuYXR0cignY2xhc3MnLCAnb3ZlcmxheScpO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gYXBwZW5kVGV4dFRvUmVsYXRpb25zaGlwKHIpIHtcclxuICAgIHJldHVybiByLmFwcGVuZCgndGV4dCcpXHJcbiAgICAgIC5hdHRyKCdjbGFzcycsICd0ZXh0JylcclxuICAgICAgLmF0dHIoJ2ZpbGwnLCAnIzAwMDAwMCcpXHJcbiAgICAgIC5hdHRyKCdmb250LXNpemUnLCAnOHB4JylcclxuICAgICAgLmF0dHIoJ3BvaW50ZXItZXZlbnRzJywgJ25vbmUnKVxyXG4gICAgICAuYXR0cigndGV4dC1hbmNob3InLCAnbWlkZGxlJylcclxuICAgICAgLnRleHQoZnVuY3Rpb24oZCkge1xyXG4gICAgICAgIHJldHVybiBkLnR5cGU7XHJcbiAgICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gYXBwZW5kUmVsYXRpb25zaGlwVG9HcmFwaCgpIHtcclxuICAgIHZhciByZWxhdGlvbnNoaXAgPSBhcHBlbmRSZWxhdGlvbnNoaXAoKTtcclxuXHJcbiAgICB2YXIgdGV4dCA9IGFwcGVuZFRleHRUb1JlbGF0aW9uc2hpcChyZWxhdGlvbnNoaXApO1xyXG5cclxuICAgIHZhciBvdXRsaW5lID0gYXBwZW5kT3V0bGluZVRvUmVsYXRpb25zaGlwKHJlbGF0aW9uc2hpcCk7XHJcbiAgICB2YXIgb3ZlcmxheSA9IGFwcGVuZE92ZXJsYXlUb1JlbGF0aW9uc2hpcChyZWxhdGlvbnNoaXApO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIG91dGxpbmU6IG91dGxpbmUsXHJcbiAgICAgIG92ZXJsYXk6IG92ZXJsYXksXHJcbiAgICAgIHJlbGF0aW9uc2hpcDogcmVsYXRpb25zaGlwLFxyXG4gICAgICB0ZXh0OiB0ZXh0XHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gY2xhc3MyY29sb3IoY2xzKSB7XHJcbiAgICB2YXIgY29sb3IgPSBjbGFzc2VzMmNvbG9yc1tjbHNdO1xyXG5cclxuICAgIGlmICghY29sb3IpIHtcclxuICAgICAgLy8gICAgICAgICAgICBjb2xvciA9IG9wdGlvbnMuY29sb3JzW01hdGgubWluKG51bUNsYXNzZXMsIG9wdGlvbnMuY29sb3JzLmxlbmd0aCAtIDEpXTtcclxuICAgICAgY29sb3IgPSBvcHRpb25zLmNvbG9yc1tudW1DbGFzc2VzICUgb3B0aW9ucy5jb2xvcnMubGVuZ3RoXTtcclxuICAgICAgY2xhc3NlczJjb2xvcnNbY2xzXSA9IGNvbG9yO1xyXG4gICAgICBudW1DbGFzc2VzKys7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGNvbG9yO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gY2xhc3MyZGFya2VuQ29sb3IoY2xzKSB7XHJcbiAgICByZXR1cm4gZDMucmdiKGNsYXNzMmNvbG9yKGNscykpLmRhcmtlcigxKTtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGNsZWFySW5mbygpIHtcclxuICAgIGluZm8uaHRtbCgnJyk7XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBjb2xvcigpIHtcclxuICAgIHJldHVybiBvcHRpb25zLmNvbG9yc1tvcHRpb25zLmNvbG9ycy5sZW5ndGggKiBNYXRoLnJhbmRvbSgpIDw8IDBdO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gY29sb3JzKCkge1xyXG4gICAgLy8gZDMuc2NoZW1lQ2F0ZWdvcnkxMCxcclxuICAgIC8vIGQzLnNjaGVtZUNhdGVnb3J5MjAsXHJcbiAgICByZXR1cm4gW1xyXG4gICAgICAnIzY4YmRmNicsIC8vIGxpZ2h0IGJsdWVcclxuICAgICAgJyM2ZGNlOWUnLCAvLyBncmVlbiAjMVxyXG4gICAgICAnI2ZhYWZjMicsIC8vIGxpZ2h0IHBpbmtcclxuICAgICAgJyNmMmJhZjYnLCAvLyBwdXJwbGVcclxuICAgICAgJyNmZjkyOGMnLCAvLyBsaWdodCByZWRcclxuICAgICAgJyNmY2VhN2UnLCAvLyBsaWdodCB5ZWxsb3dcclxuICAgICAgJyNmZmM3NjYnLCAvLyBsaWdodCBvcmFuZ2VcclxuICAgICAgJyM0MDVmOWUnLCAvLyBuYXZ5IGJsdWVcclxuICAgICAgJyNhNWFiYjYnLCAvLyBkYXJrIGdyYXlcclxuICAgICAgJyM3OGNlY2InLCAvLyBncmVlbiAjMixcclxuICAgICAgJyNiODhjYmInLCAvLyBkYXJrIHB1cnBsZVxyXG4gICAgICAnI2NlZDJkOScsIC8vIGxpZ2h0IGdyYXlcclxuICAgICAgJyNlODQ2NDYnLCAvLyBkYXJrIHJlZFxyXG4gICAgICAnI2ZhNWY4NicsIC8vIGRhcmsgcGlua1xyXG4gICAgICAnI2ZmYWIxYScsIC8vIGRhcmsgb3JhbmdlXHJcbiAgICAgICcjZmNkYTE5JywgLy8gZGFyayB5ZWxsb3dcclxuICAgICAgJyM3OTdiODAnLCAvLyBibGFja1xyXG4gICAgICAnI2M5ZDk2ZicsIC8vIHBpc3RhY2NoaW9cclxuICAgICAgJyM0Nzk5MWYnLCAvLyBncmVlbiAjM1xyXG4gICAgICAnIzcwZWRlZScsIC8vIHR1cnF1b2lzZVxyXG4gICAgICAnI2ZmNzVlYScgIC8vIHBpbmtcclxuICAgIF07XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBjb250YWlucyhhcnJheSwgaWQpIHtcclxuICAgIHZhciBmaWx0ZXIgPSBhcnJheS5maWx0ZXIoZnVuY3Rpb24oZWxlbSkge1xyXG4gICAgICByZXR1cm4gZWxlbS5pZCA9PT0gaWQ7XHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4gZmlsdGVyLmxlbmd0aCA+IDA7XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBkZWZhdWx0Q29sb3IoKSB7XHJcbiAgICByZXR1cm4gb3B0aW9ucy5yZWxhdGlvbnNoaXBDb2xvcjtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGRlZmF1bHREYXJrZW5Db2xvcigpIHtcclxuICAgIHJldHVybiBkMy5yZ2Iob3B0aW9ucy5jb2xvcnNbb3B0aW9ucy5jb2xvcnMubGVuZ3RoIC0gMV0pLmRhcmtlcigxKTtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGRyYWdFbmRlZChkKSB7XHJcbiAgICBpZiAoIWQzLmV2ZW50LmFjdGl2ZSkge1xyXG4gICAgICBzaW11bGF0aW9uLmFscGhhVGFyZ2V0KDApO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5vbk5vZGVEcmFnRW5kID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgIG9wdGlvbnMub25Ob2RlRHJhZ0VuZChkKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGRyYWdnZWQoZCkge1xyXG4gICAgc3RpY2tOb2RlKGQpO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gZHJhZ1N0YXJ0ZWQoZCkge1xyXG4gICAgaWYgKCFkMy5ldmVudC5hY3RpdmUpIHtcclxuICAgICAgc2ltdWxhdGlvbi5hbHBoYVRhcmdldCgwLjMpLnJlc3RhcnQoKTtcclxuICAgIH1cclxuXHJcbiAgICBkLmZ4ID0gZC54O1xyXG4gICAgZC5meSA9IGQueTtcclxuXHJcbiAgICBpZiAodHlwZW9mIG9wdGlvbnMub25Ob2RlRHJhZ1N0YXJ0ID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgIG9wdGlvbnMub25Ob2RlRHJhZ1N0YXJ0KGQpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gZXh0ZW5kKG9iajEsIG9iajIpIHtcclxuICAgIHZhciBvYmogPSB7fTtcclxuXHJcbiAgICBtZXJnZShvYmosIG9iajEpO1xyXG4gICAgbWVyZ2Uob2JqLCBvYmoyKTtcclxuXHJcbiAgICByZXR1cm4gb2JqO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gZm9udEF3ZXNvbWVJY29ucygpIHtcclxuICAgIHJldHVybiB7J2dsYXNzJzonZjAwMCcsJ211c2ljJzonZjAwMScsJ3NlYXJjaCc6J2YwMDInLCdlbnZlbG9wZS1vJzonZjAwMycsJ2hlYXJ0JzonZjAwNCcsJ3N0YXInOidmMDA1Jywnc3Rhci1vJzonZjAwNicsJ3VzZXInOidmMDA3JywnZmlsbSc6J2YwMDgnLCd0aC1sYXJnZSc6J2YwMDknLCd0aCc6J2YwMGEnLCd0aC1saXN0JzonZjAwYicsJ2NoZWNrJzonZjAwYycsJ3JlbW92ZSxjbG9zZSx0aW1lcyc6J2YwMGQnLCdzZWFyY2gtcGx1cyc6J2YwMGUnLCdzZWFyY2gtbWludXMnOidmMDEwJywncG93ZXItb2ZmJzonZjAxMScsJ3NpZ25hbCc6J2YwMTInLCdnZWFyLGNvZyc6J2YwMTMnLCd0cmFzaC1vJzonZjAxNCcsJ2hvbWUnOidmMDE1JywnZmlsZS1vJzonZjAxNicsJ2Nsb2NrLW8nOidmMDE3Jywncm9hZCc6J2YwMTgnLCdkb3dubG9hZCc6J2YwMTknLCdhcnJvdy1jaXJjbGUtby1kb3duJzonZjAxYScsJ2Fycm93LWNpcmNsZS1vLXVwJzonZjAxYicsJ2luYm94JzonZjAxYycsJ3BsYXktY2lyY2xlLW8nOidmMDFkJywncm90YXRlLXJpZ2h0LHJlcGVhdCc6J2YwMWUnLCdyZWZyZXNoJzonZjAyMScsJ2xpc3QtYWx0JzonZjAyMicsJ2xvY2snOidmMDIzJywnZmxhZyc6J2YwMjQnLCdoZWFkcGhvbmVzJzonZjAyNScsJ3ZvbHVtZS1vZmYnOidmMDI2Jywndm9sdW1lLWRvd24nOidmMDI3Jywndm9sdW1lLXVwJzonZjAyOCcsJ3FyY29kZSc6J2YwMjknLCdiYXJjb2RlJzonZjAyYScsJ3RhZyc6J2YwMmInLCd0YWdzJzonZjAyYycsJ2Jvb2snOidmMDJkJywnYm9va21hcmsnOidmMDJlJywncHJpbnQnOidmMDJmJywnY2FtZXJhJzonZjAzMCcsJ2ZvbnQnOidmMDMxJywnYm9sZCc6J2YwMzInLCdpdGFsaWMnOidmMDMzJywndGV4dC1oZWlnaHQnOidmMDM0JywndGV4dC13aWR0aCc6J2YwMzUnLCdhbGlnbi1sZWZ0JzonZjAzNicsJ2FsaWduLWNlbnRlcic6J2YwMzcnLCdhbGlnbi1yaWdodCc6J2YwMzgnLCdhbGlnbi1qdXN0aWZ5JzonZjAzOScsJ2xpc3QnOidmMDNhJywnZGVkZW50LG91dGRlbnQnOidmMDNiJywnaW5kZW50JzonZjAzYycsJ3ZpZGVvLWNhbWVyYSc6J2YwM2QnLCdwaG90byxpbWFnZSxwaWN0dXJlLW8nOidmMDNlJywncGVuY2lsJzonZjA0MCcsJ21hcC1tYXJrZXInOidmMDQxJywnYWRqdXN0JzonZjA0MicsJ3RpbnQnOidmMDQzJywnZWRpdCxwZW5jaWwtc3F1YXJlLW8nOidmMDQ0Jywnc2hhcmUtc3F1YXJlLW8nOidmMDQ1JywnY2hlY2stc3F1YXJlLW8nOidmMDQ2JywnYXJyb3dzJzonZjA0NycsJ3N0ZXAtYmFja3dhcmQnOidmMDQ4JywnZmFzdC1iYWNrd2FyZCc6J2YwNDknLCdiYWNrd2FyZCc6J2YwNGEnLCdwbGF5JzonZjA0YicsJ3BhdXNlJzonZjA0YycsJ3N0b3AnOidmMDRkJywnZm9yd2FyZCc6J2YwNGUnLCdmYXN0LWZvcndhcmQnOidmMDUwJywnc3RlcC1mb3J3YXJkJzonZjA1MScsJ2VqZWN0JzonZjA1MicsJ2NoZXZyb24tbGVmdCc6J2YwNTMnLCdjaGV2cm9uLXJpZ2h0JzonZjA1NCcsJ3BsdXMtY2lyY2xlJzonZjA1NScsJ21pbnVzLWNpcmNsZSc6J2YwNTYnLCd0aW1lcy1jaXJjbGUnOidmMDU3JywnY2hlY2stY2lyY2xlJzonZjA1OCcsJ3F1ZXN0aW9uLWNpcmNsZSc6J2YwNTknLCdpbmZvLWNpcmNsZSc6J2YwNWEnLCdjcm9zc2hhaXJzJzonZjA1YicsJ3RpbWVzLWNpcmNsZS1vJzonZjA1YycsJ2NoZWNrLWNpcmNsZS1vJzonZjA1ZCcsJ2Jhbic6J2YwNWUnLCdhcnJvdy1sZWZ0JzonZjA2MCcsJ2Fycm93LXJpZ2h0JzonZjA2MScsJ2Fycm93LXVwJzonZjA2MicsJ2Fycm93LWRvd24nOidmMDYzJywnbWFpbC1mb3J3YXJkLHNoYXJlJzonZjA2NCcsJ2V4cGFuZCc6J2YwNjUnLCdjb21wcmVzcyc6J2YwNjYnLCdwbHVzJzonZjA2NycsJ21pbnVzJzonZjA2OCcsJ2FzdGVyaXNrJzonZjA2OScsJ2V4Y2xhbWF0aW9uLWNpcmNsZSc6J2YwNmEnLCdnaWZ0JzonZjA2YicsJ2xlYWYnOidmMDZjJywnZmlyZSc6J2YwNmQnLCdleWUnOidmMDZlJywnZXllLXNsYXNoJzonZjA3MCcsJ3dhcm5pbmcsZXhjbGFtYXRpb24tdHJpYW5nbGUnOidmMDcxJywncGxhbmUnOidmMDcyJywnY2FsZW5kYXInOidmMDczJywncmFuZG9tJzonZjA3NCcsJ2NvbW1lbnQnOidmMDc1JywnbWFnbmV0JzonZjA3NicsJ2NoZXZyb24tdXAnOidmMDc3JywnY2hldnJvbi1kb3duJzonZjA3OCcsJ3JldHdlZXQnOidmMDc5Jywnc2hvcHBpbmctY2FydCc6J2YwN2EnLCdmb2xkZXInOidmMDdiJywnZm9sZGVyLW9wZW4nOidmMDdjJywnYXJyb3dzLXYnOidmMDdkJywnYXJyb3dzLWgnOidmMDdlJywnYmFyLWNoYXJ0LW8sYmFyLWNoYXJ0JzonZjA4MCcsJ3R3aXR0ZXItc3F1YXJlJzonZjA4MScsJ2ZhY2Vib29rLXNxdWFyZSc6J2YwODInLCdjYW1lcmEtcmV0cm8nOidmMDgzJywna2V5JzonZjA4NCcsJ2dlYXJzLGNvZ3MnOidmMDg1JywnY29tbWVudHMnOidmMDg2JywndGh1bWJzLW8tdXAnOidmMDg3JywndGh1bWJzLW8tZG93bic6J2YwODgnLCdzdGFyLWhhbGYnOidmMDg5JywnaGVhcnQtbyc6J2YwOGEnLCdzaWduLW91dCc6J2YwOGInLCdsaW5rZWRpbi1zcXVhcmUnOidmMDhjJywndGh1bWItdGFjayc6J2YwOGQnLCdleHRlcm5hbC1saW5rJzonZjA4ZScsJ3NpZ24taW4nOidmMDkwJywndHJvcGh5JzonZjA5MScsJ2dpdGh1Yi1zcXVhcmUnOidmMDkyJywndXBsb2FkJzonZjA5MycsJ2xlbW9uLW8nOidmMDk0JywncGhvbmUnOidmMDk1Jywnc3F1YXJlLW8nOidmMDk2JywnYm9va21hcmstbyc6J2YwOTcnLCdwaG9uZS1zcXVhcmUnOidmMDk4JywndHdpdHRlcic6J2YwOTknLCdmYWNlYm9vay1mLGZhY2Vib29rJzonZjA5YScsJ2dpdGh1Yic6J2YwOWInLCd1bmxvY2snOidmMDljJywnY3JlZGl0LWNhcmQnOidmMDlkJywnZmVlZCxyc3MnOidmMDllJywnaGRkLW8nOidmMGEwJywnYnVsbGhvcm4nOidmMGExJywnYmVsbCc6J2YwZjMnLCdjZXJ0aWZpY2F0ZSc6J2YwYTMnLCdoYW5kLW8tcmlnaHQnOidmMGE0JywnaGFuZC1vLWxlZnQnOidmMGE1JywnaGFuZC1vLXVwJzonZjBhNicsJ2hhbmQtby1kb3duJzonZjBhNycsJ2Fycm93LWNpcmNsZS1sZWZ0JzonZjBhOCcsJ2Fycm93LWNpcmNsZS1yaWdodCc6J2YwYTknLCdhcnJvdy1jaXJjbGUtdXAnOidmMGFhJywnYXJyb3ctY2lyY2xlLWRvd24nOidmMGFiJywnZ2xvYmUnOidmMGFjJywnd3JlbmNoJzonZjBhZCcsJ3Rhc2tzJzonZjBhZScsJ2ZpbHRlcic6J2YwYjAnLCdicmllZmNhc2UnOidmMGIxJywnYXJyb3dzLWFsdCc6J2YwYjInLCdncm91cCx1c2Vycyc6J2YwYzAnLCdjaGFpbixsaW5rJzonZjBjMScsJ2Nsb3VkJzonZjBjMicsJ2ZsYXNrJzonZjBjMycsJ2N1dCxzY2lzc29ycyc6J2YwYzQnLCdjb3B5LGZpbGVzLW8nOidmMGM1JywncGFwZXJjbGlwJzonZjBjNicsJ3NhdmUsZmxvcHB5LW8nOidmMGM3Jywnc3F1YXJlJzonZjBjOCcsJ25hdmljb24scmVvcmRlcixiYXJzJzonZjBjOScsJ2xpc3QtdWwnOidmMGNhJywnbGlzdC1vbCc6J2YwY2InLCdzdHJpa2V0aHJvdWdoJzonZjBjYycsJ3VuZGVybGluZSc6J2YwY2QnLCd0YWJsZSc6J2YwY2UnLCdtYWdpYyc6J2YwZDAnLCd0cnVjayc6J2YwZDEnLCdwaW50ZXJlc3QnOidmMGQyJywncGludGVyZXN0LXNxdWFyZSc6J2YwZDMnLCdnb29nbGUtcGx1cy1zcXVhcmUnOidmMGQ0JywnZ29vZ2xlLXBsdXMnOidmMGQ1JywnbW9uZXknOidmMGQ2JywnY2FyZXQtZG93bic6J2YwZDcnLCdjYXJldC11cCc6J2YwZDgnLCdjYXJldC1sZWZ0JzonZjBkOScsJ2NhcmV0LXJpZ2h0JzonZjBkYScsJ2NvbHVtbnMnOidmMGRiJywndW5zb3J0ZWQsc29ydCc6J2YwZGMnLCdzb3J0LWRvd24sc29ydC1kZXNjJzonZjBkZCcsJ3NvcnQtdXAsc29ydC1hc2MnOidmMGRlJywnZW52ZWxvcGUnOidmMGUwJywnbGlua2VkaW4nOidmMGUxJywncm90YXRlLWxlZnQsdW5kbyc6J2YwZTInLCdsZWdhbCxnYXZlbCc6J2YwZTMnLCdkYXNoYm9hcmQsdGFjaG9tZXRlcic6J2YwZTQnLCdjb21tZW50LW8nOidmMGU1JywnY29tbWVudHMtbyc6J2YwZTYnLCdmbGFzaCxib2x0JzonZjBlNycsJ3NpdGVtYXAnOidmMGU4JywndW1icmVsbGEnOidmMGU5JywncGFzdGUsY2xpcGJvYXJkJzonZjBlYScsJ2xpZ2h0YnVsYi1vJzonZjBlYicsJ2V4Y2hhbmdlJzonZjBlYycsJ2Nsb3VkLWRvd25sb2FkJzonZjBlZCcsJ2Nsb3VkLXVwbG9hZCc6J2YwZWUnLCd1c2VyLW1kJzonZjBmMCcsJ3N0ZXRob3Njb3BlJzonZjBmMScsJ3N1aXRjYXNlJzonZjBmMicsJ2JlbGwtbyc6J2YwYTInLCdjb2ZmZWUnOidmMGY0JywnY3V0bGVyeSc6J2YwZjUnLCdmaWxlLXRleHQtbyc6J2YwZjYnLCdidWlsZGluZy1vJzonZjBmNycsJ2hvc3BpdGFsLW8nOidmMGY4JywnYW1idWxhbmNlJzonZjBmOScsJ21lZGtpdCc6J2YwZmEnLCdmaWdodGVyLWpldCc6J2YwZmInLCdiZWVyJzonZjBmYycsJ2gtc3F1YXJlJzonZjBmZCcsJ3BsdXMtc3F1YXJlJzonZjBmZScsJ2FuZ2xlLWRvdWJsZS1sZWZ0JzonZjEwMCcsJ2FuZ2xlLWRvdWJsZS1yaWdodCc6J2YxMDEnLCdhbmdsZS1kb3VibGUtdXAnOidmMTAyJywnYW5nbGUtZG91YmxlLWRvd24nOidmMTAzJywnYW5nbGUtbGVmdCc6J2YxMDQnLCdhbmdsZS1yaWdodCc6J2YxMDUnLCdhbmdsZS11cCc6J2YxMDYnLCdhbmdsZS1kb3duJzonZjEwNycsJ2Rlc2t0b3AnOidmMTA4JywnbGFwdG9wJzonZjEwOScsJ3RhYmxldCc6J2YxMGEnLCdtb2JpbGUtcGhvbmUsbW9iaWxlJzonZjEwYicsJ2NpcmNsZS1vJzonZjEwYycsJ3F1b3RlLWxlZnQnOidmMTBkJywncXVvdGUtcmlnaHQnOidmMTBlJywnc3Bpbm5lcic6J2YxMTAnLCdjaXJjbGUnOidmMTExJywnbWFpbC1yZXBseSxyZXBseSc6J2YxMTInLCdnaXRodWItYWx0JzonZjExMycsJ2ZvbGRlci1vJzonZjExNCcsJ2ZvbGRlci1vcGVuLW8nOidmMTE1Jywnc21pbGUtbyc6J2YxMTgnLCdmcm93bi1vJzonZjExOScsJ21laC1vJzonZjExYScsJ2dhbWVwYWQnOidmMTFiJywna2V5Ym9hcmQtbyc6J2YxMWMnLCdmbGFnLW8nOidmMTFkJywnZmxhZy1jaGVja2VyZWQnOidmMTFlJywndGVybWluYWwnOidmMTIwJywnY29kZSc6J2YxMjEnLCdtYWlsLXJlcGx5LWFsbCxyZXBseS1hbGwnOidmMTIyJywnc3Rhci1oYWxmLWVtcHR5LHN0YXItaGFsZi1mdWxsLHN0YXItaGFsZi1vJzonZjEyMycsJ2xvY2F0aW9uLWFycm93JzonZjEyNCcsJ2Nyb3AnOidmMTI1JywnY29kZS1mb3JrJzonZjEyNicsJ3VubGluayxjaGFpbi1icm9rZW4nOidmMTI3JywncXVlc3Rpb24nOidmMTI4JywnaW5mbyc6J2YxMjknLCdleGNsYW1hdGlvbic6J2YxMmEnLCdzdXBlcnNjcmlwdCc6J2YxMmInLCdzdWJzY3JpcHQnOidmMTJjJywnZXJhc2VyJzonZjEyZCcsJ3B1enpsZS1waWVjZSc6J2YxMmUnLCdtaWNyb3Bob25lJzonZjEzMCcsJ21pY3JvcGhvbmUtc2xhc2gnOidmMTMxJywnc2hpZWxkJzonZjEzMicsJ2NhbGVuZGFyLW8nOidmMTMzJywnZmlyZS1leHRpbmd1aXNoZXInOidmMTM0Jywncm9ja2V0JzonZjEzNScsJ21heGNkbic6J2YxMzYnLCdjaGV2cm9uLWNpcmNsZS1sZWZ0JzonZjEzNycsJ2NoZXZyb24tY2lyY2xlLXJpZ2h0JzonZjEzOCcsJ2NoZXZyb24tY2lyY2xlLXVwJzonZjEzOScsJ2NoZXZyb24tY2lyY2xlLWRvd24nOidmMTNhJywnaHRtbDUnOidmMTNiJywnY3NzMyc6J2YxM2MnLCdhbmNob3InOidmMTNkJywndW5sb2NrLWFsdCc6J2YxM2UnLCdidWxsc2V5ZSc6J2YxNDAnLCdlbGxpcHNpcy1oJzonZjE0MScsJ2VsbGlwc2lzLXYnOidmMTQyJywncnNzLXNxdWFyZSc6J2YxNDMnLCdwbGF5LWNpcmNsZSc6J2YxNDQnLCd0aWNrZXQnOidmMTQ1JywnbWludXMtc3F1YXJlJzonZjE0NicsJ21pbnVzLXNxdWFyZS1vJzonZjE0NycsJ2xldmVsLXVwJzonZjE0OCcsJ2xldmVsLWRvd24nOidmMTQ5JywnY2hlY2stc3F1YXJlJzonZjE0YScsJ3BlbmNpbC1zcXVhcmUnOidmMTRiJywnZXh0ZXJuYWwtbGluay1zcXVhcmUnOidmMTRjJywnc2hhcmUtc3F1YXJlJzonZjE0ZCcsJ2NvbXBhc3MnOidmMTRlJywndG9nZ2xlLWRvd24sY2FyZXQtc3F1YXJlLW8tZG93bic6J2YxNTAnLCd0b2dnbGUtdXAsY2FyZXQtc3F1YXJlLW8tdXAnOidmMTUxJywndG9nZ2xlLXJpZ2h0LGNhcmV0LXNxdWFyZS1vLXJpZ2h0JzonZjE1MicsJ2V1cm8sZXVyJzonZjE1MycsJ2dicCc6J2YxNTQnLCdkb2xsYXIsdXNkJzonZjE1NScsJ3J1cGVlLGlucic6J2YxNTYnLCdjbnkscm1iLHllbixqcHknOidmMTU3JywncnVibGUscm91YmxlLHJ1Yic6J2YxNTgnLCd3b24sa3J3JzonZjE1OScsJ2JpdGNvaW4sYnRjJzonZjE1YScsJ2ZpbGUnOidmMTViJywnZmlsZS10ZXh0JzonZjE1YycsJ3NvcnQtYWxwaGEtYXNjJzonZjE1ZCcsJ3NvcnQtYWxwaGEtZGVzYyc6J2YxNWUnLCdzb3J0LWFtb3VudC1hc2MnOidmMTYwJywnc29ydC1hbW91bnQtZGVzYyc6J2YxNjEnLCdzb3J0LW51bWVyaWMtYXNjJzonZjE2MicsJ3NvcnQtbnVtZXJpYy1kZXNjJzonZjE2MycsJ3RodW1icy11cCc6J2YxNjQnLCd0aHVtYnMtZG93bic6J2YxNjUnLCd5b3V0dWJlLXNxdWFyZSc6J2YxNjYnLCd5b3V0dWJlJzonZjE2NycsJ3hpbmcnOidmMTY4JywneGluZy1zcXVhcmUnOidmMTY5JywneW91dHViZS1wbGF5JzonZjE2YScsJ2Ryb3Bib3gnOidmMTZiJywnc3RhY2stb3ZlcmZsb3cnOidmMTZjJywnaW5zdGFncmFtJzonZjE2ZCcsJ2ZsaWNrcic6J2YxNmUnLCdhZG4nOidmMTcwJywnYml0YnVja2V0JzonZjE3MScsJ2JpdGJ1Y2tldC1zcXVhcmUnOidmMTcyJywndHVtYmxyJzonZjE3MycsJ3R1bWJsci1zcXVhcmUnOidmMTc0JywnbG9uZy1hcnJvdy1kb3duJzonZjE3NScsJ2xvbmctYXJyb3ctdXAnOidmMTc2JywnbG9uZy1hcnJvdy1sZWZ0JzonZjE3NycsJ2xvbmctYXJyb3ctcmlnaHQnOidmMTc4JywnYXBwbGUnOidmMTc5Jywnd2luZG93cyc6J2YxN2EnLCdhbmRyb2lkJzonZjE3YicsJ2xpbnV4JzonZjE3YycsJ2RyaWJiYmxlJzonZjE3ZCcsJ3NreXBlJzonZjE3ZScsJ2ZvdXJzcXVhcmUnOidmMTgwJywndHJlbGxvJzonZjE4MScsJ2ZlbWFsZSc6J2YxODInLCdtYWxlJzonZjE4MycsJ2dpdHRpcCxncmF0aXBheSc6J2YxODQnLCdzdW4tbyc6J2YxODUnLCdtb29uLW8nOidmMTg2JywnYXJjaGl2ZSc6J2YxODcnLCdidWcnOidmMTg4JywndmsnOidmMTg5Jywnd2VpYm8nOidmMThhJywncmVucmVuJzonZjE4YicsJ3BhZ2VsaW5lcyc6J2YxOGMnLCdzdGFjay1leGNoYW5nZSc6J2YxOGQnLCdhcnJvdy1jaXJjbGUtby1yaWdodCc6J2YxOGUnLCdhcnJvdy1jaXJjbGUtby1sZWZ0JzonZjE5MCcsJ3RvZ2dsZS1sZWZ0LGNhcmV0LXNxdWFyZS1vLWxlZnQnOidmMTkxJywnZG90LWNpcmNsZS1vJzonZjE5MicsJ3doZWVsY2hhaXInOidmMTkzJywndmltZW8tc3F1YXJlJzonZjE5NCcsJ3R1cmtpc2gtbGlyYSx0cnknOidmMTk1JywncGx1cy1zcXVhcmUtbyc6J2YxOTYnLCdzcGFjZS1zaHV0dGxlJzonZjE5NycsJ3NsYWNrJzonZjE5OCcsJ2VudmVsb3BlLXNxdWFyZSc6J2YxOTknLCd3b3JkcHJlc3MnOidmMTlhJywnb3BlbmlkJzonZjE5YicsJ2luc3RpdHV0aW9uLGJhbmssdW5pdmVyc2l0eSc6J2YxOWMnLCdtb3J0YXItYm9hcmQsZ3JhZHVhdGlvbi1jYXAnOidmMTlkJywneWFob28nOidmMTllJywnZ29vZ2xlJzonZjFhMCcsJ3JlZGRpdCc6J2YxYTEnLCdyZWRkaXQtc3F1YXJlJzonZjFhMicsJ3N0dW1ibGV1cG9uLWNpcmNsZSc6J2YxYTMnLCdzdHVtYmxldXBvbic6J2YxYTQnLCdkZWxpY2lvdXMnOidmMWE1JywnZGlnZyc6J2YxYTYnLCdwaWVkLXBpcGVyLXBwJzonZjFhNycsJ3BpZWQtcGlwZXItYWx0JzonZjFhOCcsJ2RydXBhbCc6J2YxYTknLCdqb29tbGEnOidmMWFhJywnbGFuZ3VhZ2UnOidmMWFiJywnZmF4JzonZjFhYycsJ2J1aWxkaW5nJzonZjFhZCcsJ2NoaWxkJzonZjFhZScsJ3Bhdyc6J2YxYjAnLCdzcG9vbic6J2YxYjEnLCdjdWJlJzonZjFiMicsJ2N1YmVzJzonZjFiMycsJ2JlaGFuY2UnOidmMWI0JywnYmVoYW5jZS1zcXVhcmUnOidmMWI1Jywnc3RlYW0nOidmMWI2Jywnc3RlYW0tc3F1YXJlJzonZjFiNycsJ3JlY3ljbGUnOidmMWI4JywnYXV0b21vYmlsZSxjYXInOidmMWI5JywnY2FiLHRheGknOidmMWJhJywndHJlZSc6J2YxYmInLCdzcG90aWZ5JzonZjFiYycsJ2RldmlhbnRhcnQnOidmMWJkJywnc291bmRjbG91ZCc6J2YxYmUnLCdkYXRhYmFzZSc6J2YxYzAnLCdmaWxlLXBkZi1vJzonZjFjMScsJ2ZpbGUtd29yZC1vJzonZjFjMicsJ2ZpbGUtZXhjZWwtbyc6J2YxYzMnLCdmaWxlLXBvd2VycG9pbnQtbyc6J2YxYzQnLCdmaWxlLXBob3RvLW8sZmlsZS1waWN0dXJlLW8sZmlsZS1pbWFnZS1vJzonZjFjNScsJ2ZpbGUtemlwLW8sZmlsZS1hcmNoaXZlLW8nOidmMWM2JywnZmlsZS1zb3VuZC1vLGZpbGUtYXVkaW8tbyc6J2YxYzcnLCdmaWxlLW1vdmllLW8sZmlsZS12aWRlby1vJzonZjFjOCcsJ2ZpbGUtY29kZS1vJzonZjFjOScsJ3ZpbmUnOidmMWNhJywnY29kZXBlbic6J2YxY2InLCdqc2ZpZGRsZSc6J2YxY2MnLCdsaWZlLWJvdXksbGlmZS1idW95LGxpZmUtc2F2ZXIsc3VwcG9ydCxsaWZlLXJpbmcnOidmMWNkJywnY2lyY2xlLW8tbm90Y2gnOidmMWNlJywncmEscmVzaXN0YW5jZSxyZWJlbCc6J2YxZDAnLCdnZSxlbXBpcmUnOidmMWQxJywnZ2l0LXNxdWFyZSc6J2YxZDInLCdnaXQnOidmMWQzJywneS1jb21iaW5hdG9yLXNxdWFyZSx5Yy1zcXVhcmUsaGFja2VyLW5ld3MnOidmMWQ0JywndGVuY2VudC13ZWlibyc6J2YxZDUnLCdxcSc6J2YxZDYnLCd3ZWNoYXQsd2VpeGluJzonZjFkNycsJ3NlbmQscGFwZXItcGxhbmUnOidmMWQ4Jywnc2VuZC1vLHBhcGVyLXBsYW5lLW8nOidmMWQ5JywnaGlzdG9yeSc6J2YxZGEnLCdjaXJjbGUtdGhpbic6J2YxZGInLCdoZWFkZXInOidmMWRjJywncGFyYWdyYXBoJzonZjFkZCcsJ3NsaWRlcnMnOidmMWRlJywnc2hhcmUtYWx0JzonZjFlMCcsJ3NoYXJlLWFsdC1zcXVhcmUnOidmMWUxJywnYm9tYic6J2YxZTInLCdzb2NjZXItYmFsbC1vLGZ1dGJvbC1vJzonZjFlMycsJ3R0eSc6J2YxZTQnLCdiaW5vY3VsYXJzJzonZjFlNScsJ3BsdWcnOidmMWU2Jywnc2xpZGVzaGFyZSc6J2YxZTcnLCd0d2l0Y2gnOidmMWU4JywneWVscCc6J2YxZTknLCduZXdzcGFwZXItbyc6J2YxZWEnLCd3aWZpJzonZjFlYicsJ2NhbGN1bGF0b3InOidmMWVjJywncGF5cGFsJzonZjFlZCcsJ2dvb2dsZS13YWxsZXQnOidmMWVlJywnY2MtdmlzYSc6J2YxZjAnLCdjYy1tYXN0ZXJjYXJkJzonZjFmMScsJ2NjLWRpc2NvdmVyJzonZjFmMicsJ2NjLWFtZXgnOidmMWYzJywnY2MtcGF5cGFsJzonZjFmNCcsJ2NjLXN0cmlwZSc6J2YxZjUnLCdiZWxsLXNsYXNoJzonZjFmNicsJ2JlbGwtc2xhc2gtbyc6J2YxZjcnLCd0cmFzaCc6J2YxZjgnLCdjb3B5cmlnaHQnOidmMWY5JywnYXQnOidmMWZhJywnZXllZHJvcHBlcic6J2YxZmInLCdwYWludC1icnVzaCc6J2YxZmMnLCdiaXJ0aGRheS1jYWtlJzonZjFmZCcsJ2FyZWEtY2hhcnQnOidmMWZlJywncGllLWNoYXJ0JzonZjIwMCcsJ2xpbmUtY2hhcnQnOidmMjAxJywnbGFzdGZtJzonZjIwMicsJ2xhc3RmbS1zcXVhcmUnOidmMjAzJywndG9nZ2xlLW9mZic6J2YyMDQnLCd0b2dnbGUtb24nOidmMjA1JywnYmljeWNsZSc6J2YyMDYnLCdidXMnOidmMjA3JywnaW94aG9zdCc6J2YyMDgnLCdhbmdlbGxpc3QnOidmMjA5JywnY2MnOidmMjBhJywnc2hla2VsLHNoZXFlbCxpbHMnOidmMjBiJywnbWVhbnBhdGgnOidmMjBjJywnYnV5c2VsbGFkcyc6J2YyMGQnLCdjb25uZWN0ZGV2ZWxvcCc6J2YyMGUnLCdkYXNoY3ViZSc6J2YyMTAnLCdmb3J1bWJlZSc6J2YyMTEnLCdsZWFucHViJzonZjIxMicsJ3NlbGxzeSc6J2YyMTMnLCdzaGlydHNpbmJ1bGsnOidmMjE0Jywnc2ltcGx5YnVpbHQnOidmMjE1Jywnc2t5YXRsYXMnOidmMjE2JywnY2FydC1wbHVzJzonZjIxNycsJ2NhcnQtYXJyb3ctZG93bic6J2YyMTgnLCdkaWFtb25kJzonZjIxOScsJ3NoaXAnOidmMjFhJywndXNlci1zZWNyZXQnOidmMjFiJywnbW90b3JjeWNsZSc6J2YyMWMnLCdzdHJlZXQtdmlldyc6J2YyMWQnLCdoZWFydGJlYXQnOidmMjFlJywndmVudXMnOidmMjIxJywnbWFycyc6J2YyMjInLCdtZXJjdXJ5JzonZjIyMycsJ2ludGVyc2V4LHRyYW5zZ2VuZGVyJzonZjIyNCcsJ3RyYW5zZ2VuZGVyLWFsdCc6J2YyMjUnLCd2ZW51cy1kb3VibGUnOidmMjI2JywnbWFycy1kb3VibGUnOidmMjI3JywndmVudXMtbWFycyc6J2YyMjgnLCdtYXJzLXN0cm9rZSc6J2YyMjknLCdtYXJzLXN0cm9rZS12JzonZjIyYScsJ21hcnMtc3Ryb2tlLWgnOidmMjJiJywnbmV1dGVyJzonZjIyYycsJ2dlbmRlcmxlc3MnOidmMjJkJywnZmFjZWJvb2stb2ZmaWNpYWwnOidmMjMwJywncGludGVyZXN0LXAnOidmMjMxJywnd2hhdHNhcHAnOidmMjMyJywnc2VydmVyJzonZjIzMycsJ3VzZXItcGx1cyc6J2YyMzQnLCd1c2VyLXRpbWVzJzonZjIzNScsJ2hvdGVsLGJlZCc6J2YyMzYnLCd2aWFjb2luJzonZjIzNycsJ3RyYWluJzonZjIzOCcsJ3N1YndheSc6J2YyMzknLCdtZWRpdW0nOidmMjNhJywneWMseS1jb21iaW5hdG9yJzonZjIzYicsJ29wdGluLW1vbnN0ZXInOidmMjNjJywnb3BlbmNhcnQnOidmMjNkJywnZXhwZWRpdGVkc3NsJzonZjIzZScsJ2JhdHRlcnktNCxiYXR0ZXJ5LWZ1bGwnOidmMjQwJywnYmF0dGVyeS0zLGJhdHRlcnktdGhyZWUtcXVhcnRlcnMnOidmMjQxJywnYmF0dGVyeS0yLGJhdHRlcnktaGFsZic6J2YyNDInLCdiYXR0ZXJ5LTEsYmF0dGVyeS1xdWFydGVyJzonZjI0MycsJ2JhdHRlcnktMCxiYXR0ZXJ5LWVtcHR5JzonZjI0NCcsJ21vdXNlLXBvaW50ZXInOidmMjQ1JywnaS1jdXJzb3InOidmMjQ2Jywnb2JqZWN0LWdyb3VwJzonZjI0NycsJ29iamVjdC11bmdyb3VwJzonZjI0OCcsJ3N0aWNreS1ub3RlJzonZjI0OScsJ3N0aWNreS1ub3RlLW8nOidmMjRhJywnY2MtamNiJzonZjI0YicsJ2NjLWRpbmVycy1jbHViJzonZjI0YycsJ2Nsb25lJzonZjI0ZCcsJ2JhbGFuY2Utc2NhbGUnOidmMjRlJywnaG91cmdsYXNzLW8nOidmMjUwJywnaG91cmdsYXNzLTEsaG91cmdsYXNzLXN0YXJ0JzonZjI1MScsJ2hvdXJnbGFzcy0yLGhvdXJnbGFzcy1oYWxmJzonZjI1MicsJ2hvdXJnbGFzcy0zLGhvdXJnbGFzcy1lbmQnOidmMjUzJywnaG91cmdsYXNzJzonZjI1NCcsJ2hhbmQtZ3JhYi1vLGhhbmQtcm9jay1vJzonZjI1NScsJ2hhbmQtc3RvcC1vLGhhbmQtcGFwZXItbyc6J2YyNTYnLCdoYW5kLXNjaXNzb3JzLW8nOidmMjU3JywnaGFuZC1saXphcmQtbyc6J2YyNTgnLCdoYW5kLXNwb2NrLW8nOidmMjU5JywnaGFuZC1wb2ludGVyLW8nOidmMjVhJywnaGFuZC1wZWFjZS1vJzonZjI1YicsJ3RyYWRlbWFyayc6J2YyNWMnLCdyZWdpc3RlcmVkJzonZjI1ZCcsJ2NyZWF0aXZlLWNvbW1vbnMnOidmMjVlJywnZ2cnOidmMjYwJywnZ2ctY2lyY2xlJzonZjI2MScsJ3RyaXBhZHZpc29yJzonZjI2MicsJ29kbm9rbGFzc25pa2knOidmMjYzJywnb2Rub2tsYXNzbmlraS1zcXVhcmUnOidmMjY0JywnZ2V0LXBvY2tldCc6J2YyNjUnLCd3aWtpcGVkaWEtdyc6J2YyNjYnLCdzYWZhcmknOidmMjY3JywnY2hyb21lJzonZjI2OCcsJ2ZpcmVmb3gnOidmMjY5Jywnb3BlcmEnOidmMjZhJywnaW50ZXJuZXQtZXhwbG9yZXInOidmMjZiJywndHYsdGVsZXZpc2lvbic6J2YyNmMnLCdjb250YW8nOidmMjZkJywnNTAwcHgnOidmMjZlJywnYW1hem9uJzonZjI3MCcsJ2NhbGVuZGFyLXBsdXMtbyc6J2YyNzEnLCdjYWxlbmRhci1taW51cy1vJzonZjI3MicsJ2NhbGVuZGFyLXRpbWVzLW8nOidmMjczJywnY2FsZW5kYXItY2hlY2stbyc6J2YyNzQnLCdpbmR1c3RyeSc6J2YyNzUnLCdtYXAtcGluJzonZjI3NicsJ21hcC1zaWducyc6J2YyNzcnLCdtYXAtbyc6J2YyNzgnLCdtYXAnOidmMjc5JywnY29tbWVudGluZyc6J2YyN2EnLCdjb21tZW50aW5nLW8nOidmMjdiJywnaG91enonOidmMjdjJywndmltZW8nOidmMjdkJywnYmxhY2stdGllJzonZjI3ZScsJ2ZvbnRpY29ucyc6J2YyODAnLCdyZWRkaXQtYWxpZW4nOidmMjgxJywnZWRnZSc6J2YyODInLCdjcmVkaXQtY2FyZC1hbHQnOidmMjgzJywnY29kaWVwaWUnOidmMjg0JywnbW9keCc6J2YyODUnLCdmb3J0LWF3ZXNvbWUnOidmMjg2JywndXNiJzonZjI4NycsJ3Byb2R1Y3QtaHVudCc6J2YyODgnLCdtaXhjbG91ZCc6J2YyODknLCdzY3JpYmQnOidmMjhhJywncGF1c2UtY2lyY2xlJzonZjI4YicsJ3BhdXNlLWNpcmNsZS1vJzonZjI4YycsJ3N0b3AtY2lyY2xlJzonZjI4ZCcsJ3N0b3AtY2lyY2xlLW8nOidmMjhlJywnc2hvcHBpbmctYmFnJzonZjI5MCcsJ3Nob3BwaW5nLWJhc2tldCc6J2YyOTEnLCdoYXNodGFnJzonZjI5MicsJ2JsdWV0b290aCc6J2YyOTMnLCdibHVldG9vdGgtYic6J2YyOTQnLCdwZXJjZW50JzonZjI5NScsJ2dpdGxhYic6J2YyOTYnLCd3cGJlZ2lubmVyJzonZjI5NycsJ3dwZm9ybXMnOidmMjk4JywnZW52aXJhJzonZjI5OScsJ3VuaXZlcnNhbC1hY2Nlc3MnOidmMjlhJywnd2hlZWxjaGFpci1hbHQnOidmMjliJywncXVlc3Rpb24tY2lyY2xlLW8nOidmMjljJywnYmxpbmQnOidmMjlkJywnYXVkaW8tZGVzY3JpcHRpb24nOidmMjllJywndm9sdW1lLWNvbnRyb2wtcGhvbmUnOidmMmEwJywnYnJhaWxsZSc6J2YyYTEnLCdhc3Npc3RpdmUtbGlzdGVuaW5nLXN5c3RlbXMnOidmMmEyJywnYXNsLWludGVycHJldGluZyxhbWVyaWNhbi1zaWduLWxhbmd1YWdlLWludGVycHJldGluZyc6J2YyYTMnLCdkZWFmbmVzcyxoYXJkLW9mLWhlYXJpbmcsZGVhZic6J2YyYTQnLCdnbGlkZSc6J2YyYTUnLCdnbGlkZS1nJzonZjJhNicsJ3NpZ25pbmcsc2lnbi1sYW5ndWFnZSc6J2YyYTcnLCdsb3ctdmlzaW9uJzonZjJhOCcsJ3ZpYWRlbyc6J2YyYTknLCd2aWFkZW8tc3F1YXJlJzonZjJhYScsJ3NuYXBjaGF0JzonZjJhYicsJ3NuYXBjaGF0LWdob3N0JzonZjJhYycsJ3NuYXBjaGF0LXNxdWFyZSc6J2YyYWQnLCdwaWVkLXBpcGVyJzonZjJhZScsJ2ZpcnN0LW9yZGVyJzonZjJiMCcsJ3lvYXN0JzonZjJiMScsJ3RoZW1laXNsZSc6J2YyYjInLCdnb29nbGUtcGx1cy1jaXJjbGUsZ29vZ2xlLXBsdXMtb2ZmaWNpYWwnOidmMmIzJywnZmEsZm9udC1hd2Vzb21lJzonZjJiNCd9O1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGljb24oZCkge1xyXG4gICAgICB2YXIgY29kZTtcclxuXHJcbiAgICAgIGlmIChvcHRpb25zLmljb25NYXAgJiYgb3B0aW9ucy5zaG93SWNvbnMgJiYgb3B0aW9ucy5pY29ucykge1xyXG4gICAgICAgIGlmIChvcHRpb25zLmljb25zW2QubGFiZWxzWzBdXSAmJiBvcHRpb25zLmljb25NYXBbb3B0aW9ucy5pY29uc1tkLmxhYmVsc1swXV1dKSB7XHJcbiAgICAgICAgICBjb2RlID0gb3B0aW9ucy5pY29uTWFwW29wdGlvbnMuaWNvbnNbZC5sYWJlbHNbMF1dXTtcclxuICAgICAgICB9IGVsc2UgaWYgKG9wdGlvbnMuaWNvbk1hcFtkLmxhYmVsc1swXV0pIHtcclxuICAgICAgICAgIGNvZGUgPSBvcHRpb25zLmljb25NYXBbZC5sYWJlbHNbMF1dO1xyXG4gICAgICAgIH0gZWxzZSBpZiAob3B0aW9ucy5pY29uc1tkLmxhYmVsc1swXV0pIHtcclxuICAgICAgICAgIGNvZGUgPSBvcHRpb25zLmljb25zW2QubGFiZWxzWzBdXTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiBjb2RlO1xyXG4gICAgfVxyXG5cclxuZnVuY3Rpb24gaW1hZ2UoZCkge1xyXG4gIHZhciBpLCBpbWFnZXNGb3JMYWJlbCwgaW1nLCBpbWdMZXZlbCwgbGFiZWwsIGxhYmVsUHJvcGVydHlWYWx1ZSwgcHJvcGVydHksIHZhbHVlO1xyXG5cclxuICBpZiAob3B0aW9ucy5pbWFnZXMpIHtcclxuICAgIGltYWdlc0ZvckxhYmVsID0gb3B0aW9ucy5pbWFnZU1hcFtkLmxhYmVsc1swXV07XHJcblxyXG4gICAgaWYgKGltYWdlc0ZvckxhYmVsKSB7XHJcbiAgICAgIGltZ0xldmVsID0gMDtcclxuXHJcbiAgICAgIGZvciAoaSA9IDA7IGkgPCBpbWFnZXNGb3JMYWJlbC5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIGxhYmVsUHJvcGVydHlWYWx1ZSA9IGltYWdlc0ZvckxhYmVsW2ldLnNwbGl0KCd8Jyk7XHJcblxyXG4gICAgICAgIHN3aXRjaCAobGFiZWxQcm9wZXJ0eVZhbHVlLmxlbmd0aCkge1xyXG4gICAgICAgICAgY2FzZSAzOlxyXG4gICAgICAgICAgICB2YWx1ZSA9IGxhYmVsUHJvcGVydHlWYWx1ZVsyXTtcclxuICAgICAgICAgICAgLyogZmFsbHMgdGhyb3VnaCAqL1xyXG4gICAgICAgICAgY2FzZSAyOlxyXG4gICAgICAgICAgICBwcm9wZXJ0eSA9IGxhYmVsUHJvcGVydHlWYWx1ZVsxXTtcclxuICAgICAgICAgICAgLyogZmFsbHMgdGhyb3VnaCAqL1xyXG4gICAgICAgICAgY2FzZSAxOlxyXG4gICAgICAgICAgICBsYWJlbCA9IGxhYmVsUHJvcGVydHlWYWx1ZVswXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChkLmxhYmVsc1swXSA9PT0gbGFiZWwgJiZcclxuICAgICAgICAgICghcHJvcGVydHkgfHwgZC5wcm9wZXJ0aWVzW3Byb3BlcnR5XSAhPT0gdW5kZWZpbmVkKSAmJlxyXG4gICAgICAgICAgKCF2YWx1ZSB8fCBkLnByb3BlcnRpZXNbcHJvcGVydHldID09PSB2YWx1ZSkpIHtcclxuICAgICAgICAgIGlmIChsYWJlbFByb3BlcnR5VmFsdWUubGVuZ3RoID4gaW1nTGV2ZWwpIHtcclxuICAgICAgICAgICAgaW1nID0gb3B0aW9ucy5pbWFnZXNbaW1hZ2VzRm9yTGFiZWxbaV1dO1xyXG4gICAgICAgICAgICBpbWdMZXZlbCA9IGxhYmVsUHJvcGVydHlWYWx1ZS5sZW5ndGg7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICByZXR1cm4gaW1nO1xyXG59XHJcblxyXG5mdW5jdGlvbiBpbml0KF9zZWxlY3RvciwgX29wdGlvbnMpIHtcclxuICBpbml0SWNvbk1hcCgpO1xyXG5cclxuICBtZXJnZShvcHRpb25zLCBfb3B0aW9ucyk7XHJcblxyXG4gIGlmIChvcHRpb25zLmljb25zKSB7XHJcbiAgICBvcHRpb25zLnNob3dJY29ucyA9IHRydWU7XHJcbiAgfVxyXG5cclxuICBpZiAoIW9wdGlvbnMubWluQ29sbGlzaW9uKSB7XHJcbiAgICBvcHRpb25zLm1pbkNvbGxpc2lvbiA9IG9wdGlvbnMubm9kZVJhZGl1cyAqIDI7XHJcbiAgfVxyXG5cclxuICBpbml0SW1hZ2VNYXAoKTtcclxuXHJcbiAgc2VsZWN0b3IgPSBfc2VsZWN0b3I7XHJcblxyXG4gIGNvbnRhaW5lciA9IGQzLnNlbGVjdChzZWxlY3Rvcik7XHJcblxyXG4gIGNvbnRhaW5lci5hdHRyKCdjbGFzcycsICduZW80amQzJylcclxuICAgIC5odG1sKCcnKTtcclxuXHJcbiAgaWYgKG9wdGlvbnMuaW5mb1BhbmVsKSB7XHJcbiAgICBpbmZvID0gYXBwZW5kSW5mb1BhbmVsKGNvbnRhaW5lcik7XHJcbiAgfVxyXG5cclxuICBhcHBlbmRHcmFwaChjb250YWluZXIpO1xyXG5cclxuICBzaW11bGF0aW9uID0gaW5pdFNpbXVsYXRpb24oKTtcclxuXHJcblxyXG4gIGlmIChvcHRpb25zLm5lbzRqRGF0YSkge1xyXG4gICAgbG9hZE5lbzRqRGF0YShvcHRpb25zLm5lbzRqRGF0YSk7XHJcbiAgfSBlbHNlIGlmIChvcHRpb25zLm5lbzRqRGF0YVVybCkge1xyXG4gICAgbG9hZE5lbzRqRGF0YUZyb21Vcmwob3B0aW9ucy5uZW80akRhdGFVcmwpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvcjogYm90aCBuZW80akRhdGEgYW5kIG5lbzRqRGF0YVVybCBhcmUgZW1wdHkhJyk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBpbml0SWNvbk1hcCgpIHtcclxuICBPYmplY3Qua2V5cyhvcHRpb25zLmljb25NYXApLmZvckVhY2goZnVuY3Rpb24oa2V5LCBpbmRleCkge1xyXG4gICAgdmFyIGtleXMgPSBrZXkuc3BsaXQoJywnKSxcclxuICAgICAgdmFsdWUgPSBvcHRpb25zLmljb25NYXBba2V5XTtcclxuXHJcbiAgICBrZXlzLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XHJcbiAgICAgIG9wdGlvbnMuaWNvbk1hcFtrZXldID0gdmFsdWU7XHJcbiAgICB9KTtcclxuICB9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gaW5pdEltYWdlTWFwKCkge1xyXG4gIHZhciBrZXksIGtleXMsIHNlbGVjdG9yO1xyXG5cclxuICBmb3IgKGtleSBpbiBvcHRpb25zLmltYWdlcykge1xyXG4gICAgaWYgKG9wdGlvbnMuaW1hZ2VzLmhhc093blByb3BlcnR5KGtleSkpIHtcclxuICAgICAga2V5cyA9IGtleS5zcGxpdCgnfCcpO1xyXG5cclxuICAgICAgaWYgKCFvcHRpb25zLmltYWdlTWFwW2tleXNbMF1dKSB7XHJcbiAgICAgICAgb3B0aW9ucy5pbWFnZU1hcFtrZXlzWzBdXSA9IFtrZXldO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIG9wdGlvbnMuaW1hZ2VNYXBba2V5c1swXV0ucHVzaChrZXkpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBpbml0U2ltdWxhdGlvbigpIHtcclxuICB2YXIgc3ByZWFkRmFjdG9yID0gMS4yNTtcclxuICB2YXIgc2ltdWxhdGlvbiA9IGQzLmZvcmNlU2ltdWxhdGlvbigpXHJcbiAgLy8uZm9yY2UoJ3gnLCBkMy5mb3JjZUNvbGxpZGUoKS5zdHJlbmd0aCgwLjAwMikpXHJcbiAgLy8uZm9yY2UoJ3knLCBkMy5mb3JjZUNvbGxpZGUoKS5zdHJlbmd0aCgwLjAwMikpXHJcbiAgLy8uZm9yY2UoJ3knLCBkMy5mb3JjZSgpLnN0cmVuZ3RoKDAuMDAyKSlcclxuICAgIC5mb3JjZSgnY29sbGlkZScsIGQzLmZvcmNlQ29sbGlkZSgpLnJhZGl1cyhmdW5jdGlvbihkKSB7XHJcbiAgICAgIHJldHVybiBvcHRpb25zLm1pbkNvbGxpc2lvbiAqIHNwcmVhZEZhY3RvcjtcclxuICAgIH0pLml0ZXJhdGlvbnMoMTApKVxyXG4gICAgLmZvcmNlKCdjaGFyZ2UnLCBkMy5mb3JjZU1hbnlCb2R5KCkpXHJcbiAgICAuZm9yY2UoJ2xpbmsnLCBkMy5mb3JjZUxpbmsoKS5pZChmdW5jdGlvbihkKSB7XHJcbiAgICAgIHJldHVybiBkLmlkO1xyXG4gICAgfSkpXHJcbiAgICAuZm9yY2UoJ2NlbnRlcicsIGQzLmZvcmNlQ2VudGVyKHN2Zy5ub2RlKCkucGFyZW50RWxlbWVudC5wYXJlbnRFbGVtZW50LmNsaWVudFdpZHRoIC8gMiwgc3ZnLm5vZGUoKS5wYXJlbnRFbGVtZW50LnBhcmVudEVsZW1lbnQuY2xpZW50SGVpZ2h0IC8gMikpXHJcbiAgICAub24oJ3RpY2snLCBmdW5jdGlvbigpIHtcclxuICAgICAgdGljaygpO1xyXG4gICAgfSlcclxuICAgIC5vbignZW5kJywgZnVuY3Rpb24oKSB7XHJcbiAgICAgIGlmIChvcHRpb25zLnpvb21GaXQgJiYgIWp1c3RMb2FkZWQpIHtcclxuICAgICAgICBqdXN0TG9hZGVkID0gdHJ1ZTtcclxuICAgICAgICB6b29tRml0KDIpO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgcmV0dXJuIHNpbXVsYXRpb247XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGxvYWROZW80akRhdGEoKSB7XHJcbiAgbm9kZXMgPSBbXTtcclxuICByZWxhdGlvbnNoaXBzID0gW107XHJcblxyXG4gIHVwZGF0ZVdpdGhOZW80akRhdGEob3B0aW9ucy5uZW80akRhdGEpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBsb2FkTmVvNGpEYXRhRnJvbVVybChuZW80akRhdGFVcmwpIHtcclxuICBub2RlcyA9IFtdO1xyXG4gIHJlbGF0aW9uc2hpcHMgPSBbXTtcclxuXHJcbiAgZDMuanNvbihuZW80akRhdGFVcmwsIGZ1bmN0aW9uKGVycm9yLCBkYXRhKSB7XHJcbiAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICB9XHJcblxyXG4gICAgdXBkYXRlV2l0aE5lbzRqRGF0YShkYXRhKTtcclxuICB9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gbWVyZ2UodGFyZ2V0LCBzb3VyY2UpIHtcclxuICBPYmplY3Qua2V5cyhzb3VyY2UpLmZvckVhY2goZnVuY3Rpb24ocHJvcGVydHkpIHtcclxuICAgIHRhcmdldFtwcm9wZXJ0eV0gPSBzb3VyY2VbcHJvcGVydHldO1xyXG4gIH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBuZW80akRhdGFUb0QzRGF0YShkYXRhKSB7XHJcbiAgdmFyIGdyYXBoID0ge1xyXG4gICAgbm9kZXM6IFtdLFxyXG4gICAgcmVsYXRpb25zaGlwczogW11cclxuICB9O1xyXG5cclxuICBkYXRhLnJlc3VsdHMuZm9yRWFjaChmdW5jdGlvbihyZXN1bHQpIHtcclxuICAgIHJlc3VsdC5kYXRhLmZvckVhY2goZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICBkYXRhLmdyYXBoLm5vZGVzLmZvckVhY2goZnVuY3Rpb24obm9kZSkge1xyXG4gICAgICAgIGlmICghY29udGFpbnMoZ3JhcGgubm9kZXMsIG5vZGUuaWQpKSB7XHJcbiAgICAgICAgICBncmFwaC5ub2Rlcy5wdXNoKG5vZGUpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcblxyXG4gICAgICBkYXRhLmdyYXBoLnJlbGF0aW9uc2hpcHMuZm9yRWFjaChmdW5jdGlvbihyZWxhdGlvbnNoaXApIHtcclxuICAgICAgICByZWxhdGlvbnNoaXAuc291cmNlID0gcmVsYXRpb25zaGlwLnN0YXJ0Tm9kZTtcclxuICAgICAgICByZWxhdGlvbnNoaXAudGFyZ2V0ID0gcmVsYXRpb25zaGlwLmVuZE5vZGU7XHJcbiAgICAgICAgZ3JhcGgucmVsYXRpb25zaGlwcy5wdXNoKHJlbGF0aW9uc2hpcCk7XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgZGF0YS5ncmFwaC5yZWxhdGlvbnNoaXBzLnNvcnQoZnVuY3Rpb24oYSwgYikge1xyXG4gICAgICAgIGlmIChhLnNvdXJjZSA+IGIuc291cmNlKSB7XHJcbiAgICAgICAgICByZXR1cm4gMTtcclxuICAgICAgICB9IGVsc2UgaWYgKGEuc291cmNlIDwgYi5zb3VyY2UpIHtcclxuICAgICAgICAgIHJldHVybiAtMTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgaWYgKGEudGFyZ2V0ID4gYi50YXJnZXQpIHtcclxuICAgICAgICAgICAgcmV0dXJuIDE7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgaWYgKGEudGFyZ2V0IDwgYi50YXJnZXQpIHtcclxuICAgICAgICAgICAgcmV0dXJuIC0xO1xyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcmV0dXJuIDA7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZGF0YS5ncmFwaC5yZWxhdGlvbnNoaXBzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgaWYgKGkgIT09IDAgJiYgZGF0YS5ncmFwaC5yZWxhdGlvbnNoaXBzW2ldLnNvdXJjZSA9PT0gZGF0YS5ncmFwaC5yZWxhdGlvbnNoaXBzW2ktMV0uc291cmNlICYmIGRhdGEuZ3JhcGgucmVsYXRpb25zaGlwc1tpXS50YXJnZXQgPT09IGRhdGEuZ3JhcGgucmVsYXRpb25zaGlwc1tpLTFdLnRhcmdldCkge1xyXG4gICAgICAgICAgZGF0YS5ncmFwaC5yZWxhdGlvbnNoaXBzW2ldLmxpbmtudW0gPSBkYXRhLmdyYXBoLnJlbGF0aW9uc2hpcHNbaSAtIDFdLmxpbmtudW0gKyAxO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICBkYXRhLmdyYXBoLnJlbGF0aW9uc2hpcHNbaV0ubGlua251bSA9IDE7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgcmV0dXJuIGdyYXBoO1xyXG59XHJcblxyXG5mdW5jdGlvbiByb3RhdGUoY3gsIGN5LCB4LCB5LCBhbmdsZSkge1xyXG4gIHZhciByYWRpYW5zID0gKE1hdGguUEkgLyAxODApICogYW5nbGUsXHJcbiAgICBjb3MgPSBNYXRoLmNvcyhyYWRpYW5zKSxcclxuICAgIHNpbiA9IE1hdGguc2luKHJhZGlhbnMpLFxyXG4gICAgbnggPSAoY29zICogKHggLSBjeCkpICsgKHNpbiAqICh5IC0gY3kpKSArIGN4LFxyXG4gICAgbnkgPSAoY29zICogKHkgLSBjeSkpIC0gKHNpbiAqICh4IC0gY3gpKSArIGN5O1xyXG5cclxuICByZXR1cm4geyB4OiBueCwgeTogbnkgfTtcclxufVxyXG5cclxuZnVuY3Rpb24gcm90YXRlUG9pbnQoYywgcCwgYW5nbGUpIHtcclxuICAvLyBjb25zb2xlLmxvZygncm90YXRlUG9pbnQnLCBjLCBwLCBhbmdsZSlcclxuXHJcbiAgcmV0dXJuIHJvdGF0ZShjLngsIGMueSwgcC54LCBwLnksIGFuZ2xlKTtcclxufVxyXG5cclxuZnVuY3Rpb24gcm90YXRpb24oc291cmNlLCB0YXJnZXQpIHtcclxuICByZXR1cm4gTWF0aC5hdGFuMih0YXJnZXQueSAtIHNvdXJjZS55LCB0YXJnZXQueCAtIHNvdXJjZS54KSAqIDE4MCAvIE1hdGguUEk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNpemUoKSB7XHJcbiAgcmV0dXJuIHtcclxuICAgIG5vZGVzOiBub2Rlcy5sZW5ndGgsXHJcbiAgICByZWxhdGlvbnNoaXBzOiByZWxhdGlvbnNoaXBzLmxlbmd0aFxyXG4gIH07XHJcbn1cclxuLypcclxuICAgIGZ1bmN0aW9uIHNtb290aFRyYW5zZm9ybShlbGVtLCB0cmFuc2xhdGUsIHNjYWxlKSB7XHJcbiAgICAgICAgdmFyIGFuaW1hdGlvbk1pbGxpc2Vjb25kcyA9IDUwMDAsXHJcbiAgICAgICAgICAgIHRpbWVvdXRNaWxsaXNlY29uZHMgPSA1MCxcclxuICAgICAgICAgICAgc3RlcHMgPSBwYXJzZUludChhbmltYXRpb25NaWxsaXNlY29uZHMgLyB0aW1lb3V0TWlsbGlzZWNvbmRzKTtcclxuXHJcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgc21vb3RoVHJhbnNmb3JtU3RlcChlbGVtLCB0cmFuc2xhdGUsIHNjYWxlLCB0aW1lb3V0TWlsbGlzZWNvbmRzLCAxLCBzdGVwcyk7XHJcbiAgICAgICAgfSwgdGltZW91dE1pbGxpc2Vjb25kcyk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gc21vb3RoVHJhbnNmb3JtU3RlcChlbGVtLCB0cmFuc2xhdGUsIHNjYWxlLCB0aW1lb3V0TWlsbGlzZWNvbmRzLCBzdGVwLCBzdGVwcykge1xyXG4gICAgICAgIHZhciBwcm9ncmVzcyA9IHN0ZXAgLyBzdGVwcztcclxuXHJcbiAgICAgICAgZWxlbS5hdHRyKCd0cmFuc2Zvcm0nLCAndHJhbnNsYXRlKCcgKyAodHJhbnNsYXRlWzBdICogcHJvZ3Jlc3MpICsgJywgJyArICh0cmFuc2xhdGVbMV0gKiBwcm9ncmVzcykgKyAnKSBzY2FsZSgnICsgKHNjYWxlICogcHJvZ3Jlc3MpICsgJyknKTtcclxuXHJcbiAgICAgICAgaWYgKHN0ZXAgPCBzdGVwcykge1xyXG4gICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgc21vb3RoVHJhbnNmb3JtU3RlcChlbGVtLCB0cmFuc2xhdGUsIHNjYWxlLCB0aW1lb3V0TWlsbGlzZWNvbmRzLCBzdGVwICsgMSwgc3RlcHMpO1xyXG4gICAgICAgICAgICB9LCB0aW1lb3V0TWlsbGlzZWNvbmRzKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICAqL1xyXG5mdW5jdGlvbiBzdGlja05vZGUoZCkge1xyXG4gIGQuZnggPSBkMy5ldmVudC54O1xyXG4gIGQuZnkgPSBkMy5ldmVudC55O1xyXG59XHJcblxyXG5mdW5jdGlvbiB0aWNrKCkge1xyXG4gIHRpY2tOb2RlcygpO1xyXG4gIHRpY2tSZWxhdGlvbnNoaXBzKCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHRpY2tOb2RlcygpIHtcclxuICBpZiAobm9kZSkge1xyXG4gICAgbm9kZS5hdHRyKCd0cmFuc2Zvcm0nLCBmdW5jdGlvbihkKSB7XHJcbiAgICAgIHJldHVybiAndHJhbnNsYXRlKCcgKyBkLnggKyAnLCAnICsgZC55ICsgJyknO1xyXG4gICAgfSk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiB0aWNrUmVsYXRpb25zaGlwcygpIHtcclxuICBpZiAocmVsYXRpb25zaGlwKSB7XHJcbiAgICByZWxhdGlvbnNoaXAuYXR0cigndHJhbnNmb3JtJywgZnVuY3Rpb24oZCkge1xyXG4gICAgICB2YXIgYW5nbGUgPSByb3RhdGlvbihkLnNvdXJjZSwgZC50YXJnZXQpO1xyXG4gICAgICByZXR1cm4gJ3RyYW5zbGF0ZSgnICsgZC5zb3VyY2UueCArICcsICcgKyBkLnNvdXJjZS55ICsgJykgcm90YXRlKCcgKyBhbmdsZSArICcpJztcclxuICAgIH0pO1xyXG5cclxuICAgIHRpY2tSZWxhdGlvbnNoaXBzVGV4dHMoKTtcclxuICAgIHRpY2tSZWxhdGlvbnNoaXBzT3V0bGluZXMoKTtcclxuICAgIHRpY2tSZWxhdGlvbnNoaXBzT3ZlcmxheXMoKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHByb2R1Y2VCb3VuZGluZ0JveCh0ZXh0Tm9kZSwgcmVsYXRpb25zaGlwKXtcclxuICByZXR1cm4gdGV4dE5vZGUubm9kZSgpLmdldEJCb3goKTtcclxufVxyXG5cclxuZnVuY3Rpb24gdGlja1JlbGF0aW9uc2hpcHNPdXRsaW5lcygpIHtcclxuICByZWxhdGlvbnNoaXAuZWFjaChmdW5jdGlvbihyZWxhdGlvbnNoaXApIHtcclxuXHJcbiAgICB2YXIgcmVsID0gZDMuc2VsZWN0KHRoaXMpO1xyXG4gICAgdmFyIG91dGxpbmUgPSByZWwuc2VsZWN0KCcub3V0bGluZScpO1xyXG4gICAgdmFyIHRleHQgPSByZWwuc2VsZWN0KCcudGV4dCcpO1xyXG4gICAgdmFyIGJib3ggPSB0ZXh0Lm5vZGUoKS5nZXRCQm94KCk7XHJcbiAgICB2YXIgcGFkZGluZyA9IDA7XHJcblxyXG5cclxuICAgIHZhciB0ZXh0Qm91bmRpbmdCb3ggPSBwcm9kdWNlQm91bmRpbmdCb3godGV4dCwgcmVsYXRpb25zaGlwKTtcclxuXHJcbiAgICBvdXRsaW5lLmF0dHIoJ2QnLCBmdW5jdGlvbihkKSB7XHJcbiAgICAgIHZhciBjZW50ZXIgPSB7IHg6IDAsIHk6IDAgfSxcclxuICAgICAgICBhbmdsZSA9IHJvdGF0aW9uKGQuc291cmNlLCBkLnRhcmdldCksXHJcbiAgICAgICAgdGV4dFBhZGRpbmcgPSAwLFxyXG4gICAgICAgIHUgPSB1bml0YXJ5VmVjdG9yKGQuc291cmNlLCBkLnRhcmdldCksXHJcbiAgICAgICAgdGV4dE1hcmdpbiA9IHsgeDogKGQudGFyZ2V0LnggLSBkLnNvdXJjZS54IC0gKHRleHRCb3VuZGluZ0JveC53aWR0aCArIHRleHRQYWRkaW5nKSAqIHUueCkgKiAwLjUsIHk6IChkLnRhcmdldC55IC0gZC5zb3VyY2UueSAtICh0ZXh0Qm91bmRpbmdCb3gud2lkdGggKyB0ZXh0UGFkZGluZykgKiB1LnkpICogMC41IH0sXHJcbiAgICAgICAgbiA9IHVuaXRhcnlOb3JtYWxWZWN0b3IoZC5zb3VyY2UsIGQudGFyZ2V0KSxcclxuICAgICAgICByb3RhdGVkUG9pbnRBMSA9IHJvdGF0ZVBvaW50KGNlbnRlciwgeyB4OiAwICsgKG9wdGlvbnMubm9kZVJhZGl1cyArIDEpICogdS54IC0gbi54LCB5OiAwICsgKG9wdGlvbnMubm9kZVJhZGl1cyArIDEpICogdS55IC0gbi55IH0sIGFuZ2xlKSxcclxuICAgICAgICByb3RhdGVkUG9pbnRCMSA9IHJvdGF0ZVBvaW50KGNlbnRlciwgeyB4OiB0ZXh0TWFyZ2luLnggLSBuLngsIHk6IHRleHRNYXJnaW4ueSAtIG4ueSB9LCBhbmdsZSksXHJcbiAgICAgICAgcm90YXRlZFBvaW50QzEgPSByb3RhdGVQb2ludChjZW50ZXIsIHsgeDogdGV4dE1hcmdpbi54LCB5OiB0ZXh0TWFyZ2luLnkgfSwgYW5nbGUpLFxyXG4gICAgICAgIHJvdGF0ZWRQb2ludEQxID0gcm90YXRlUG9pbnQoY2VudGVyLCB7IHg6IDAgKyAob3B0aW9ucy5ub2RlUmFkaXVzICsgMSkgKiB1LngsIHk6IDAgKyAob3B0aW9ucy5ub2RlUmFkaXVzICsgMSkgKiB1LnkgfSwgYW5nbGUpLFxyXG4gICAgICAgIHJvdGF0ZWRQb2ludEEyID0gcm90YXRlUG9pbnQoY2VudGVyLCB7IHg6IGQudGFyZ2V0LnggLSBkLnNvdXJjZS54IC0gdGV4dE1hcmdpbi54IC0gbi54LCB5OiBkLnRhcmdldC55IC0gZC5zb3VyY2UueSAtIHRleHRNYXJnaW4ueSAtIG4ueSB9LCBhbmdsZSksXHJcbiAgICAgICAgcm90YXRlZFBvaW50QjIgPSByb3RhdGVQb2ludChjZW50ZXIsIHsgeDogZC50YXJnZXQueCAtIGQuc291cmNlLnggLSAob3B0aW9ucy5ub2RlUmFkaXVzICsgMSkgKiB1LnggLSBuLnggLSB1LnggKiBvcHRpb25zLmFycm93U2l6ZSwgeTogZC50YXJnZXQueSAtIGQuc291cmNlLnkgLSAob3B0aW9ucy5ub2RlUmFkaXVzICsgMSkgKiB1LnkgLSBuLnkgLSB1LnkgKiBvcHRpb25zLmFycm93U2l6ZSB9LCBhbmdsZSksXHJcbiAgICAgICAgcm90YXRlZFBvaW50QzIgPSByb3RhdGVQb2ludChjZW50ZXIsIHsgeDogZC50YXJnZXQueCAtIGQuc291cmNlLnggLSAob3B0aW9ucy5ub2RlUmFkaXVzICsgMSkgKiB1LnggLSBuLnggKyAobi54IC0gdS54KSAqIG9wdGlvbnMuYXJyb3dTaXplLCB5OiBkLnRhcmdldC55IC0gZC5zb3VyY2UueSAtIChvcHRpb25zLm5vZGVSYWRpdXMgKyAxKSAqIHUueSAtIG4ueSArIChuLnkgLSB1LnkpICogb3B0aW9ucy5hcnJvd1NpemUgfSwgYW5nbGUpLFxyXG4gICAgICAgIHJvdGF0ZWRQb2ludEQyID0gcm90YXRlUG9pbnQoY2VudGVyLCB7IHg6IGQudGFyZ2V0LnggLSBkLnNvdXJjZS54IC0gKG9wdGlvbnMubm9kZVJhZGl1cyArIDEpICogdS54LCB5OiBkLnRhcmdldC55IC0gZC5zb3VyY2UueSAtIChvcHRpb25zLm5vZGVSYWRpdXMgKyAxKSAqIHUueSB9LCBhbmdsZSksXHJcbiAgICAgICAgcm90YXRlZFBvaW50RTIgPSByb3RhdGVQb2ludChjZW50ZXIsIHsgeDogZC50YXJnZXQueCAtIGQuc291cmNlLnggLSAob3B0aW9ucy5ub2RlUmFkaXVzICsgMSkgKiB1LnggKyAoLSBuLnggLSB1LngpICogb3B0aW9ucy5hcnJvd1NpemUsIHk6IGQudGFyZ2V0LnkgLSBkLnNvdXJjZS55IC0gKG9wdGlvbnMubm9kZVJhZGl1cyArIDEpICogdS55ICsgKC0gbi55IC0gdS55KSAqIG9wdGlvbnMuYXJyb3dTaXplIH0sIGFuZ2xlKSxcclxuICAgICAgICByb3RhdGVkUG9pbnRGMiA9IHJvdGF0ZVBvaW50KGNlbnRlciwgeyB4OiBkLnRhcmdldC54IC0gZC5zb3VyY2UueCAtIChvcHRpb25zLm5vZGVSYWRpdXMgKyAxKSAqIHUueCAtIHUueCAqIG9wdGlvbnMuYXJyb3dTaXplLCB5OiBkLnRhcmdldC55IC0gZC5zb3VyY2UueSAtIChvcHRpb25zLm5vZGVSYWRpdXMgKyAxKSAqIHUueSAtIHUueSAqIG9wdGlvbnMuYXJyb3dTaXplIH0sIGFuZ2xlKSxcclxuICAgICAgICByb3RhdGVkUG9pbnRHMiA9IHJvdGF0ZVBvaW50KGNlbnRlciwgeyB4OiBkLnRhcmdldC54IC0gZC5zb3VyY2UueCAtIHRleHRNYXJnaW4ueCwgeTogZC50YXJnZXQueSAtIGQuc291cmNlLnkgLSB0ZXh0TWFyZ2luLnkgfSwgYW5nbGUpO1xyXG5cclxuICAgICAgcmV0dXJuICdNICcgKyByb3RhdGVkUG9pbnRBMS54ICsgJyAnICsgcm90YXRlZFBvaW50QTEueSArXHJcbiAgICAgICAgJyBMICcgKyByb3RhdGVkUG9pbnRCMS54ICsgJyAnICsgcm90YXRlZFBvaW50QjEueSArXHJcbiAgICAgICAgJyBMICcgKyByb3RhdGVkUG9pbnRDMS54ICsgJyAnICsgcm90YXRlZFBvaW50QzEueSArXHJcbiAgICAgICAgJyBMICcgKyByb3RhdGVkUG9pbnREMS54ICsgJyAnICsgcm90YXRlZFBvaW50RDEueSArXHJcbiAgICAgICAgJyBaIE0gJyArIHJvdGF0ZWRQb2ludEEyLnggKyAnICcgKyByb3RhdGVkUG9pbnRBMi55ICtcclxuICAgICAgICAnIEwgJyArIHJvdGF0ZWRQb2ludEIyLnggKyAnICcgKyByb3RhdGVkUG9pbnRCMi55ICtcclxuICAgICAgICAnIEwgJyArIHJvdGF0ZWRQb2ludEMyLnggKyAnICcgKyByb3RhdGVkUG9pbnRDMi55ICtcclxuICAgICAgICAnIEwgJyArIHJvdGF0ZWRQb2ludEQyLnggKyAnICcgKyByb3RhdGVkUG9pbnREMi55ICtcclxuICAgICAgICAnIEwgJyArIHJvdGF0ZWRQb2ludEUyLnggKyAnICcgKyByb3RhdGVkUG9pbnRFMi55ICtcclxuICAgICAgICAnIEwgJyArIHJvdGF0ZWRQb2ludEYyLnggKyAnICcgKyByb3RhdGVkUG9pbnRGMi55ICtcclxuICAgICAgICAnIEwgJyArIHJvdGF0ZWRQb2ludEcyLnggKyAnICcgKyByb3RhdGVkUG9pbnRHMi55ICtcclxuICAgICAgICAnIFonO1xyXG4gICAgfSk7XHJcbiAgfSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHRpY2tSZWxhdGlvbnNoaXBzT3ZlcmxheXMoKSB7XHJcbiAgcmVsYXRpb25zaGlwT3ZlcmxheS5hdHRyKCdkJywgZnVuY3Rpb24oZCkge1xyXG4gICAgdmFyIGNlbnRlciA9IHsgeDogMCwgeTogMCB9LFxyXG4gICAgICBhbmdsZSA9IHJvdGF0aW9uKGQuc291cmNlLCBkLnRhcmdldCksXHJcbiAgICAgIG4xID0gdW5pdGFyeU5vcm1hbFZlY3RvcihkLnNvdXJjZSwgZC50YXJnZXQpLFxyXG4gICAgICBuID0gdW5pdGFyeU5vcm1hbFZlY3RvcihkLnNvdXJjZSwgZC50YXJnZXQsIDUwKSxcclxuICAgICAgcm90YXRlZFBvaW50QSA9IHJvdGF0ZVBvaW50KGNlbnRlciwgeyB4OiAwIC0gbi54LCB5OiAwIC0gbi55IH0sIGFuZ2xlKSxcclxuICAgICAgcm90YXRlZFBvaW50QiA9IHJvdGF0ZVBvaW50KGNlbnRlciwgeyB4OiBkLnRhcmdldC54IC0gZC5zb3VyY2UueCAtIG4ueCwgeTogZC50YXJnZXQueSAtIGQuc291cmNlLnkgLSBuLnkgfSwgYW5nbGUpLFxyXG4gICAgICByb3RhdGVkUG9pbnRDID0gcm90YXRlUG9pbnQoY2VudGVyLCB7IHg6IGQudGFyZ2V0LnggLSBkLnNvdXJjZS54ICsgbi54IC0gbjEueCwgeTogZC50YXJnZXQueSAtIGQuc291cmNlLnkgKyBuLnkgLSBuMS55IH0sIGFuZ2xlKSxcclxuICAgICAgcm90YXRlZFBvaW50RCA9IHJvdGF0ZVBvaW50KGNlbnRlciwgeyB4OiAwICsgbi54IC0gbjEueCwgeTogMCArIG4ueSAtIG4xLnkgfSwgYW5nbGUpO1xyXG5cclxuICAgIHJldHVybiAnTSAnICsgcm90YXRlZFBvaW50QS54ICsgJyAnICsgcm90YXRlZFBvaW50QS55ICtcclxuICAgICAgJyBMICcgKyByb3RhdGVkUG9pbnRCLnggKyAnICcgKyByb3RhdGVkUG9pbnRCLnkgK1xyXG4gICAgICAnIEwgJyArIHJvdGF0ZWRQb2ludEMueCArICcgJyArIHJvdGF0ZWRQb2ludEMueSArXHJcbiAgICAgICcgTCAnICsgcm90YXRlZFBvaW50RC54ICsgJyAnICsgcm90YXRlZFBvaW50RC55ICtcclxuICAgICAgJyBaJztcclxuICB9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gdGlja1JlbGF0aW9uc2hpcHNUZXh0cygpIHtcclxuICByZWxhdGlvbnNoaXBUZXh0LmF0dHIoJ3RyYW5zZm9ybScsIGZ1bmN0aW9uKGQpIHtcclxuICAgIHZhciBhbmdsZSA9IChyb3RhdGlvbihkLnNvdXJjZSwgZC50YXJnZXQpICsgMzYwKSAlIDM2MCxcclxuICAgICAgbWlycm9yID0gYW5nbGUgPiA5MCAmJiBhbmdsZSA8IDI3MCxcclxuICAgICAgY2VudGVyID0geyB4OiAwLCB5OiAwIH0sXHJcbiAgICAgIG4gPSB1bml0YXJ5Tm9ybWFsVmVjdG9yKGQuc291cmNlLCBkLnRhcmdldCksXHJcbiAgICAgIG5XZWlnaHQgPSBtaXJyb3IgPyAyIDogLTMsXHJcbiAgICAgIHBvaW50ID0geyB4OiAoZC50YXJnZXQueCAtIGQuc291cmNlLngpICogMC41ICsgbi54ICogbldlaWdodCwgeTogKGQudGFyZ2V0LnkgLSBkLnNvdXJjZS55KSAqIDAuNSArIG4ueSAqIG5XZWlnaHQgfSxcclxuICAgICAgcm90YXRlZFBvaW50ID0gcm90YXRlUG9pbnQoY2VudGVyLCBwb2ludCwgYW5nbGUpO1xyXG5cclxuICAgIHJldHVybiAndHJhbnNsYXRlKCcgKyByb3RhdGVkUG9pbnQueCArICcsICcgKyByb3RhdGVkUG9pbnQueSArICcpIHJvdGF0ZSgnICsgKG1pcnJvciA/IDE4MCA6IDApICsgJyknO1xyXG4gIH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiB0b1N0cmluZyhkKSB7XHJcbiAgdmFyIHMgPSBkLmxhYmVscyA/IGQubGFiZWxzWzBdIDogZC50eXBlO1xyXG5cclxuICBzICs9ICcgKDxpZD46ICcgKyBkLmlkO1xyXG5cclxuICBPYmplY3Qua2V5cyhkLnByb3BlcnRpZXMpLmZvckVhY2goZnVuY3Rpb24ocHJvcGVydHkpIHtcclxuICAgIHMgKz0gJywgJyArIHByb3BlcnR5ICsgJzogJyArIEpTT04uc3RyaW5naWZ5KGQucHJvcGVydGllc1twcm9wZXJ0eV0pO1xyXG4gIH0pO1xyXG5cclxuICBzICs9ICcpJztcclxuXHJcbiAgcmV0dXJuIHM7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVuaXRhcnlOb3JtYWxWZWN0b3Ioc291cmNlLCB0YXJnZXQsIG5ld0xlbmd0aCkge1xyXG4gIHZhciBjZW50ZXIgPSB7IHg6IDAsIHk6IDAgfSxcclxuICAgIHZlY3RvciA9IHVuaXRhcnlWZWN0b3Ioc291cmNlLCB0YXJnZXQsIG5ld0xlbmd0aCk7XHJcblxyXG4gIHJldHVybiByb3RhdGVQb2ludChjZW50ZXIsIHZlY3RvciwgOTApO1xyXG59XHJcblxyXG5mdW5jdGlvbiB1bml0YXJ5VmVjdG9yKHNvdXJjZSwgdGFyZ2V0LCBuZXdMZW5ndGgpIHtcclxuICB2YXIgbGVuZ3RoID0gTWF0aC5zcXJ0KE1hdGgucG93KHRhcmdldC54IC0gc291cmNlLngsIDIpICsgTWF0aC5wb3codGFyZ2V0LnkgLSBzb3VyY2UueSwgMikpIC8gTWF0aC5zcXJ0KG5ld0xlbmd0aCB8fCAxKTtcclxuXHJcbiAgcmV0dXJuIHtcclxuICAgIHg6ICh0YXJnZXQueCAtIHNvdXJjZS54KSAvIGxlbmd0aCxcclxuICAgIHk6ICh0YXJnZXQueSAtIHNvdXJjZS55KSAvIGxlbmd0aCxcclxuICB9O1xyXG59XHJcblxyXG5mdW5jdGlvbiB1cGRhdGVXaXRoRDNEYXRhKGQzRGF0YSkge1xyXG4gIC8vIG1hcmtlclxyXG4gIHVwZGF0ZU5vZGVzQW5kUmVsYXRpb25zaGlwcyhkM0RhdGEubm9kZXMsIGQzRGF0YS5yZWxhdGlvbnNoaXBzKTtcclxufVxyXG5cclxuZnVuY3Rpb24gdXBkYXRlV2l0aE5lbzRqRGF0YShuZW80akRhdGEpIHtcclxuICB2YXIgZDNEYXRhID0gbmVvNGpEYXRhVG9EM0RhdGEobmVvNGpEYXRhKTtcclxuICB1cGRhdGVXaXRoRDNEYXRhKGQzRGF0YSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZUluZm8oZCkge1xyXG4gIGNsZWFySW5mbygpO1xyXG5cclxuICBpZiAoZC5sYWJlbHMpIHtcclxuICAgIGFwcGVuZEluZm9FbGVtZW50Q2xhc3MoJ2NsYXNzJywgZC5sYWJlbHNbMF0pO1xyXG4gIH0gZWxzZSB7XHJcbiAgICBhcHBlbmRJbmZvRWxlbWVudFJlbGF0aW9uc2hpcCgnY2xhc3MnLCBkLnR5cGUpO1xyXG4gIH1cclxuXHJcbiAgYXBwZW5kSW5mb0VsZW1lbnRQcm9wZXJ0eSgncHJvcGVydHknLCAnJmx0O2lkJmd0OycsIGQuaWQpO1xyXG5cclxuICBPYmplY3Qua2V5cyhkLnByb3BlcnRpZXMpLmZvckVhY2goZnVuY3Rpb24ocHJvcGVydHkpIHtcclxuICAgIGFwcGVuZEluZm9FbGVtZW50UHJvcGVydHkoJ3Byb3BlcnR5JywgcHJvcGVydHksIEpTT04uc3RyaW5naWZ5KGQucHJvcGVydGllc1twcm9wZXJ0eV0pKTtcclxuICB9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gdXBkYXRlTm9kZXMobikge1xyXG4gIEFycmF5LnByb3RvdHlwZS5wdXNoLmFwcGx5KG5vZGVzLCBuKTtcclxuXHJcbiAgbm9kZSA9IHN2Z05vZGVzLnNlbGVjdEFsbCgnLm5vZGUnKVxyXG4gICAgLmRhdGEobm9kZXMsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQuaWQ7IH0pO1xyXG4gIHZhciBub2RlRW50ZXIgPSBhcHBlbmROb2RlVG9HcmFwaCgpO1xyXG4gIG5vZGUgPSBub2RlRW50ZXIubWVyZ2Uobm9kZSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZU5vZGVzQW5kUmVsYXRpb25zaGlwcyhuLCByKSB7XHJcbiAgdXBkYXRlUmVsYXRpb25zaGlwcyhyKTtcclxuICB1cGRhdGVOb2RlcyhuKTtcclxuXHJcbiAgc2ltdWxhdGlvbi5ub2Rlcyhub2Rlcyk7XHJcbiAgc2ltdWxhdGlvbi5mb3JjZSgnbGluaycpLmxpbmtzKHJlbGF0aW9uc2hpcHMpO1xyXG59XHJcblxyXG5mdW5jdGlvbiB1cGRhdGVSZWxhdGlvbnNoaXBzKHIpIHtcclxuICBBcnJheS5wcm90b3R5cGUucHVzaC5hcHBseShyZWxhdGlvbnNoaXBzLCByKTtcclxuXHJcbiAgcmVsYXRpb25zaGlwID0gc3ZnUmVsYXRpb25zaGlwcy5zZWxlY3RBbGwoJy5yZWxhdGlvbnNoaXAnKVxyXG4gICAgLmRhdGEocmVsYXRpb25zaGlwcywgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5pZDsgfSk7XHJcblxyXG4gIHZhciByZWxhdGlvbnNoaXBFbnRlciA9IGFwcGVuZFJlbGF0aW9uc2hpcFRvR3JhcGgoKTtcclxuXHJcbiAgcmVsYXRpb25zaGlwID0gcmVsYXRpb25zaGlwRW50ZXIucmVsYXRpb25zaGlwLm1lcmdlKHJlbGF0aW9uc2hpcCk7XHJcbiAgcmVsYXRpb25zaGlwT3V0bGluZSA9IHN2Zy5zZWxlY3RBbGwoJy5yZWxhdGlvbnNoaXAgLm91dGxpbmUnKTtcclxuICByZWxhdGlvbnNoaXBPdXRsaW5lID0gcmVsYXRpb25zaGlwRW50ZXIub3V0bGluZS5tZXJnZShyZWxhdGlvbnNoaXBPdXRsaW5lKTtcclxuXHJcbiAgcmVsYXRpb25zaGlwT3ZlcmxheSA9IHN2Zy5zZWxlY3RBbGwoJy5yZWxhdGlvbnNoaXAgLm92ZXJsYXknKTtcclxuICByZWxhdGlvbnNoaXBPdmVybGF5ID0gcmVsYXRpb25zaGlwRW50ZXIub3ZlcmxheS5tZXJnZShyZWxhdGlvbnNoaXBPdmVybGF5KTtcclxuXHJcbiAgcmVsYXRpb25zaGlwVGV4dCA9IHN2Zy5zZWxlY3RBbGwoJy5yZWxhdGlvbnNoaXAgLnRleHQnKTtcclxuICByZWxhdGlvbnNoaXBUZXh0ID0gcmVsYXRpb25zaGlwRW50ZXIudGV4dC5tZXJnZShyZWxhdGlvbnNoaXBUZXh0KTtcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIHZlcnNpb24oKSB7XHJcbiAgcmV0dXJuIFZFUlNJT047XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHpvb21GaXQodHJhbnNpdGlvbkR1cmF0aW9uKSB7XHJcbiAgdmFyIGJvdW5kcyA9IHN2Zy5ub2RlKCkuZ2V0QkJveCgpO1xyXG4gIHZhciBwYXJlbnQgPSBzdmcubm9kZSgpLnBhcmVudEVsZW1lbnQucGFyZW50RWxlbWVudDtcclxuXHJcbiAgaWYgKCFwYXJlbnQpIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIHZhciBmdWxsV2lkdGggPSBwYXJlbnQuY2xpZW50V2lkdGg7XHJcbiAgdmFyIGZ1bGxIZWlnaHQgPSBwYXJlbnQuY2xpZW50SGVpZ2h0O1xyXG4gIHZhciB3aWR0aCA9IGJvdW5kcy53aWR0aDtcclxuICB2YXIgaGVpZ2h0ID0gYm91bmRzLmhlaWdodDtcclxuICB2YXIgbWlkWCA9IGJvdW5kcy54ICsgd2lkdGggLyAyO1xyXG4gIHZhciBtaWRZID0gYm91bmRzLnkgKyBoZWlnaHQgLyAyO1xyXG5cclxuICBpZiAod2lkdGggPT09IDAgfHwgaGVpZ2h0ID09PSAwKSB7XHJcbiAgICByZXR1cm47IC8vIG5vdGhpbmcgdG8gZml0XHJcbiAgfVxyXG5cclxuICBzdmdTY2FsZSA9IDAuODUgLyBNYXRoLm1heCh3aWR0aCAvIGZ1bGxXaWR0aCwgaGVpZ2h0IC8gZnVsbEhlaWdodCk7XHJcbiAgc3ZnVHJhbnNsYXRlID0gW2Z1bGxXaWR0aCAvIDIgLSBzdmdTY2FsZSAqIG1pZFgsIGZ1bGxIZWlnaHQgLyAyIC0gc3ZnU2NhbGUgKiBtaWRZXTtcclxuXHJcbiAgc3ZnLmF0dHIoJ3RyYW5zZm9ybScsICd0cmFuc2xhdGUoJyArIHN2Z1RyYW5zbGF0ZVswXSArICcsICcgKyBzdmdUcmFuc2xhdGVbMV0gKyAnKSBzY2FsZSgnICsgc3ZnU2NhbGUgKyAnKScpO1xyXG4gIC8vICAgICAgICBzbW9vdGhUcmFuc2Zvcm0oc3ZnVHJhbnNsYXRlLCBzdmdTY2FsZSk7XHJcbn1cclxuXHJcbmluaXQoX3NlbGVjdG9yLCBfb3B0aW9ucyk7XHJcblxyXG5yZXR1cm4ge1xyXG4gIG5lbzRqRGF0YVRvRDNEYXRhOiBuZW80akRhdGFUb0QzRGF0YSxcclxuICBzaXplOiBzaXplLFxyXG4gIHVwZGF0ZVdpdGhEM0RhdGE6IHVwZGF0ZVdpdGhEM0RhdGEsXHJcbiAgdXBkYXRlV2l0aE5lbzRqRGF0YTogdXBkYXRlV2l0aE5lbzRqRGF0YSxcclxuICB2ZXJzaW9uOiB2ZXJzaW9uXHJcbn07XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTmVvNGpEMztcclxuIl19
