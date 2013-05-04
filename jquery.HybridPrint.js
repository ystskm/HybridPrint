// HybridPrint
// a JavaScript library on synquery.
// require: jQuery > 1.7.0, 
//        : jquery.jqcanvo.js (jQuery plug-in)
//        : EasySvg.js (javascript plug-in)

function HybridPrint(w, h, o) {

  o = $.extend({
    canvas_id: 'hp_canvas',
    svg_id: 'hp_svg',
    appendTo: $('body'),
    hidden: true,
    unit: 'px' // TODO "mm"
  }, o);

  var hp = this;

  this._width = w, this._height = h, this._unit = o.unit;
  this.$wrapper = $('<div/>').addClass('hybridprint wrapper');

  // canvas
  if(o.canvas_id) {
    this.$canvas = $('<canvas/>').attr({
      id: o.canvas_id,
      width: w,
      height: h
    }), this.$canvas.appendTo(this.wrapper());
    this._canvo = this.$canvas.canvo();
  }

  // svg
  if(o.svg_id) {
    this._svg = new Svg({
      id: o.svg_id,
      width: w,
      height: h
    }), this._svg.appendTo(this.wrapper());
  }

  // iframe for printing
  var $ifr = this.$iframe = $('<iframe/>').css('border', 'none');
  var $dfd = this.$dfd = new $.Deferred();

  var $div = this.$div = $('<div/>');
  if(o.hidden === true) {
    $div.css({
      opacity: 0
    });
  } else {
    $ifr.attr({
      width: this._width,
      height: this._height
    });
  }
  $div.appendTo(o.appendTo).append(this.$iframe);

  $ifr.ready(function() {
    var win = $ifr.get(0).contentWindow, doc = win.document;
    var sty = '@page {';
    sty += 'size: ';
    sty += (o.size ? o.size: hp._width + hp.unit + ' ' + hp._height + hp.unit)
      + ';';
    sty += 'margin: ';
    sty += '0;';
    sty += '}';
    doc.body.style.margin = 0;
    $(doc.head).append($('<style type="text/css" media="print"/>').text(sty));
    $(doc.body).append(hp.wrapper());
    $dfd.resolve(), $dfd = null;
  });

};

(function() {

  var HybridProtos = {
    wrapper: wrapper
  };
  for( var i in HybridProtos)
    HybridPrint.prototype[i] = HybridProtos[i];

  var HybridProtosAsync = { // return this.
    line: line,
    rect: rect,
    circle: circle,
    ellipse: ellipse,
    text: text,
    image: image,
    print: print,
    remove: remove
  };
  for( var i in HybridProtosAsync)
    HybridPrint.prototype[i] = (function(i) {
      return function() {
        var hp = this, args = arguments;
        $.when(hp.$dfd).done(function() {
          HybridProtosAsync[i].apply(hp, args);
        });
        return hp;
      };
    })(i);

  function wrapper() {
    return this.$wrapper;
  }

  function line(x1, y1, x2, y2, o) {
    o = setCapitalizedKey($.extend({
      x1: x1,
      y1: y1,
      x2: x2,
      y2: y2,
      border: '1px solid #444'
    }, o));
    adoptBorder(o);

    var w = o.x2 === null ? o.x1: Math.abs(o.x1 - o.x2);
    o = calcAlign(this, w, ['x1', 'x2'], o);
    this._svg.line(o);
  }

  function rect(x, y, w, h, o) {
    o = setCapitalizedKey($.extend({
      x: x,
      y: y,
      width: w,
      height: h,
      border: '1px solid #444',
      background: 'transparent'
    }, o));
    adoptBorder(o);
    adoptBackground(o);

    if(isNaN(parseInt(o.x)) && !o.align)
      o.align = o.x;
    o = calcAlign(this, o.width, ['x', 'w'], o);
    this._svg.rect(o);
  };

  function circle(cx, cy, r, o) {
    o = setCapitalizedKey($.extend({
      cx: cx,
      cy: cy,
      r: r,
      border: '1px solid #444',
      background: 'transparent'
    }, o));
    adoptBorder(o);
    adoptBackground(o);

    o = calcAlign(this, parseInt(o.r) * 2 || o.r, ['cx', 'r'], o);
    this._svg.circle(o);
  }

  function ellipse(cx, cy, rx, ry, o) {
    o = setCapitalizedKey($.extend({
      cx: cx,
      cy: cy,
      rx: rx,
      ry: ry,
      border: '1px solid #444',
      background: 'transparent'
    }, o));
    adoptBorder(o);
    adoptBackground(o);

    o = calcAlign(this, parseInt(o.rx) * 2 || o.rx, ['cx', 'rx'], o);
    this._svg.ellipse(o);
  }

  function text(t, o) {
    o = setCapitalizedKey($.extend({
      x: 0,
      y: 0,
      color: '#444',
      'font-size': '10.5px',
      'font-family': 'serif'
    }, o));
    adoptColor(o);

    var item = this._svg.text(t, o);

    // chrome's getComputedTextLength is not correct when letter-spacing is set.
    var w = item.getComputedTextLength(), c = item.getNumberOfChars();
    var ls = parseInt(o['letter-spacing']) || 0;

    calcAlign(this, w + (c - 1) * ls, true, o, item);
  }

  function image(href, o) {
    o = setCapitalizedKey($.extend({
      x: 0,
      y: 0,
      width: '100px',
      height: '100px',
    }, o));

    var iw = o['image-width'] || o.width;
    if(iw && /%/.test(o.width))
      iw = iw * (parseFloat(o.width) / 100);
    if(!iw)
      throw new Error('image-width must be set for: ' + href);

    o = calcAlign(this, iw, ['x', 'w'], o);
    this._svg.image(href, o);
  }

  function setCapitalizedKey(o) {
    $.each(o, function(k, v) {
      if(/([A-Z])/.test(k))
        o[k.replace(RegExp.$1, '-' + RegExp.$1.toLowerCase())] = v;
    });
    return o;
  }

  function errAnalyzingFailure(type) {
    return type + ' analyzing failure: ';
  }

  function adoptColor(o) {
    var rgb = null, alp = null, pre = null;
    try {
      rgb = codeToRgb(o.color).join();
      alp = o.alpha, pre = alp ? 'rgba': 'rgb';
    } catch(e) {
      console.warn(errAnalyzingFailure('Color') + o.color);
      console.warn(e);
    };
    if(!o.fill)
      o.fill = pre ? pre + "(" + rgb + (alp ? ',' + alp: '') + ")": o.color;
  }

  function adoptBackground(o) {
    var rgb = null, alp = null, pre = null;

    try {
      if(!/transparent/.test(o.background)) {
        rgb = codeToRgb(o.background).join();
        alp = o.alpha, pre = alp ? 'rgba': 'rgb';
      }
    } catch(e) {
      console.warn(errAnalyzingFailure('Background') + o.background);
      console.warn(e);
    };
    if(!o.fill)
      o.fill = pre ? pre + "(" + rgb + (alp ? ',' + alp: '') + ")"
        : o.background;
  }

  function adoptBorder(o) {
    var bdr = null, rgb = null, alp = null, pre = null;
    try {
      bdr = o.border.split(/\s/), rgb = codeToRgb(bdr[2]).join();
      alp = o.alpha, pre = alp ? 'rgba': 'rgb';
    } catch(e) {
      console.warn(errAnalyzingFailure('Border') + o.border);
      console.warn(e);
    }
    if(!o.stroke)
      o.stroke = pre ? pre + "(" + rgb + (alp ? ',' + alp: '') + ")": bdr[2];
    if(!o['stroke-width'])
      o['stroke-width'] = String(bdr[0]).replace(/px/, '');
  }

  function calcAlign(hp, w, keys, o, item) {

    var margin = null, align = null, left = null;

    o = $.extend({}, o);

    var left_key = 'x';
    if($.isArray(keys)) {
      if(keys.indexOf('x1') != -1)
        left_key = 'x1';
      else if(keys.indexOf('cx') != -1)
        left_key = 'cx';
    };

    if(o.align)
      align = o.align;
    else if(isNaN(parseInt(o[left_key])))
      align = o[left_key], o[left_key] = 0;

    if(!align)
      return o;

    margin = o.margin;
    if(!$.isArray(margin))
      switch(align) {
      case 'center':
        margin = [o.margin, o.margin];
        break;
      case 'right':
        margin = [null, o.margin];
        break;
      }

    margin.forEach(function(v, i) {
      margin[i] = parseInt(margin[i]) ? parseInt(margin[i]): 0;
    });

    switch(align) {
    case 'center':
      if(w === 'auto')
        w = hp._width - margin[0] - margin[1];
      left = margin[0] + (hp._width - margin[0] - margin[1] - w) / 2;
      break;
    case 'right':
      left = margin[0] + (hp._width - margin[0] - margin[1] - w);
      break;
    default:
      left = margin[0];
    }

    var fn = item ? function(k, v) {
      item.setAttribute(k, v);
    }: function(k, v) {
      o[k] = v;
    };

    if(keys == true)
      fn('x', left);
    else
      keys.forEach(function(k) {
        if(k == 'x')
          return fn('x', left);
        if(k == 'x1')
          return fn('x1', left);
        if(k == 'x2')
          return fn('x2', left + w);
        if(k == 'cx')
          return fn('cx', left + w / 2);
        if(k == 'w')
          return fn('width', w);
        if(k == 'r' || k == 'rx')
          return fn(k, w / 2);
      });

    return o;

  }

  function print() {
    if(this.$iframe)
      this.$iframe.get(0).contentWindow.print();
    if(this.$div.parent().is('body'))
      this.$div.remove();
  }

  function remove() {
    this.$div.remove();
  }

  // utilities >>
  function codeToRgb(code) {
    var ccode = codeAdjust(code).replace(/^#/, '');
    return [parseInt(ccode.slice(0, 2), '16'),
      parseInt(ccode.slice(2, 4), '16'), parseInt(ccode.slice(4, 6), '16')];
  }

  function codeAdjust(code) {
    if(code.substr(0, 3) == 'rgb')
      return code.replace(/-/g, ',');
    if(!(code.charAt(0) == '#' && (code.length == 4 || code.length == 7)))
      throw new Error([' - illegal color code.(code = ', code, ')'].join(""));
    if(code.length == 4)
      code = [code[0], code[1], code[1], code[2], code[2], code[3], code[3]]
          .join("");
    return code;
  }

})();
