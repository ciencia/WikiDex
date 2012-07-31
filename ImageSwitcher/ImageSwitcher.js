//<pre>
/*
 * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
 * Digest Algorithm, as defined in RFC 1321.
 * Version 2.2 Copyright (C) Paul Johnston 1999 - 2009
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for more info.
 */

(function(){
/*
 * Configurable variables.
 */
var hexcase = 0; /* hex output format. 0 - lowercase; 1 - uppercase */

/*
 * Perform a simple self-test to see if the VM is working
 */
function md5_vm_test()
{
	return hex_md5("abc").toLowerCase() == "900150983cd24fb0d6963f7d28e17f72";
}

/*
 * Convert a raw string to an array of little-endian words
 * Characters >255 have their high-byte silently ignored.
 */
function rstr2binl(input) {
	var output = Array(input.length >> 2);
	for(var i = 0; i < output.length; i++) {
		output[i] = 0;
	}
	for(var i = 0; i < input.length * 8; i += 8) {
		output[i>>5] |= (input.charCodeAt(i / 8) & 0xFF) << (i%32);
	}
	return output;
}

/*
 * Convert an array of little-endian words to a string
 */
function binl2rstr(input) {
	var output = "";
	for(var i = 0; i < input.length * 32; i += 8) {
		output += String.fromCharCode((input[i>>5] >>> (i % 32)) & 0xFF);
	}
	return output;
}

/*
 * Bitwise rotate a 32-bit number to the left.
 */
function bit_rol(num, cnt) {
	return (num << cnt) | (num >>> (32 - cnt));
}

/*
 * These functions implement the four basic operations the algorithm uses.
 */
function md5_cmn(q, a, b, x, s, t) {
	return safe_add(bit_rol(safe_add(safe_add(a, q), safe_add(x, t)), s),b);
}
function md5_ff(a, b, c, d, x, s, t) {
	return md5_cmn((b & c) | ((~b) & d), a, b, x, s, t);
}
function md5_gg(a, b, c, d, x, s, t) {
	return md5_cmn((b & d) | (c & (~d)), a, b, x, s, t);
}
function md5_hh(a, b, c, d, x, s, t) {
	return md5_cmn(b ^ c ^ d, a, b, x, s, t);
}
function md5_ii(a, b, c, d, x, s, t) {
	return md5_cmn(c ^ (b | (~d)), a, b, x, s, t);
}

/*
 * Add integers, wrapping at 2^32. This uses 16-bit operations internally
 * to work around bugs in some JS interpreters.
 */
function safe_add(x, y) {
	var lsw = (x & 0xFFFF) + (y & 0xFFFF);
	var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
	return (msw << 16) | (lsw & 0xFFFF);
}

/*
 * Calculate the MD5 of an array of little-endian words, and a bit length.
 */
function binl_md5(x, len) {
	/* append padding */
	x[len >> 5] |= 0x80 << ((len) % 32);
	x[(((len + 64) >>> 9) << 4) + 14] = len;

	var a =  1732584193;
	var b = -271733879;
	var c = -1732584194;
	var d =  271733878;

	for(var i = 0; i < x.length; i += 16) {
		var olda = a;
		var oldb = b;
		var oldc = c;
		var oldd = d;

		a = md5_ff(a, b, c, d, x[i+ 0], 7 , -680876936);
		d = md5_ff(d, a, b, c, x[i+ 1], 12, -389564586);
		c = md5_ff(c, d, a, b, x[i+ 2], 17,  606105819);
		b = md5_ff(b, c, d, a, x[i+ 3], 22, -1044525330);
		a = md5_ff(a, b, c, d, x[i+ 4], 7 , -176418897);
		d = md5_ff(d, a, b, c, x[i+ 5], 12,  1200080426);
		c = md5_ff(c, d, a, b, x[i+ 6], 17, -1473231341);
		b = md5_ff(b, c, d, a, x[i+ 7], 22, -45705983);
		a = md5_ff(a, b, c, d, x[i+ 8], 7 ,  1770035416);
		d = md5_ff(d, a, b, c, x[i+ 9], 12, -1958414417);
		c = md5_ff(c, d, a, b, x[i+10], 17, -42063);
		b = md5_ff(b, c, d, a, x[i+11], 22, -1990404162);
		a = md5_ff(a, b, c, d, x[i+12], 7 ,  1804603682);
		d = md5_ff(d, a, b, c, x[i+13], 12, -40341101);
		c = md5_ff(c, d, a, b, x[i+14], 17, -1502002290);
		b = md5_ff(b, c, d, a, x[i+15], 22,  1236535329);

		a = md5_gg(a, b, c, d, x[i+ 1], 5 , -165796510);
		d = md5_gg(d, a, b, c, x[i+ 6], 9 , -1069501632);
		c = md5_gg(c, d, a, b, x[i+11], 14,  643717713);
		b = md5_gg(b, c, d, a, x[i+ 0], 20, -373897302);
		a = md5_gg(a, b, c, d, x[i+ 5], 5 , -701558691);
		d = md5_gg(d, a, b, c, x[i+10], 9 ,  38016083);
		c = md5_gg(c, d, a, b, x[i+15], 14, -660478335);
		b = md5_gg(b, c, d, a, x[i+ 4], 20, -405537848);
		a = md5_gg(a, b, c, d, x[i+ 9], 5 ,  568446438);
		d = md5_gg(d, a, b, c, x[i+14], 9 , -1019803690);
		c = md5_gg(c, d, a, b, x[i+ 3], 14, -187363961);
		b = md5_gg(b, c, d, a, x[i+ 8], 20,  1163531501);
		a = md5_gg(a, b, c, d, x[i+13], 5 , -1444681467);
		d = md5_gg(d, a, b, c, x[i+ 2], 9 , -51403784);
		c = md5_gg(c, d, a, b, x[i+ 7], 14,  1735328473);
		b = md5_gg(b, c, d, a, x[i+12], 20, -1926607734);

		a = md5_hh(a, b, c, d, x[i+ 5], 4 , -378558);
		d = md5_hh(d, a, b, c, x[i+ 8], 11, -2022574463);
		c = md5_hh(c, d, a, b, x[i+11], 16,  1839030562);
		b = md5_hh(b, c, d, a, x[i+14], 23, -35309556);
		a = md5_hh(a, b, c, d, x[i+ 1], 4 , -1530992060);
		d = md5_hh(d, a, b, c, x[i+ 4], 11,  1272893353);
		c = md5_hh(c, d, a, b, x[i+ 7], 16, -155497632);
		b = md5_hh(b, c, d, a, x[i+10], 23, -1094730640);
		a = md5_hh(a, b, c, d, x[i+13], 4 ,  681279174);
		d = md5_hh(d, a, b, c, x[i+ 0], 11, -358537222);
		c = md5_hh(c, d, a, b, x[i+ 3], 16, -722521979);
		b = md5_hh(b, c, d, a, x[i+ 6], 23,  76029189);
		a = md5_hh(a, b, c, d, x[i+ 9], 4 , -640364487);
		d = md5_hh(d, a, b, c, x[i+12], 11, -421815835);
		c = md5_hh(c, d, a, b, x[i+15], 16,  530742520);
		b = md5_hh(b, c, d, a, x[i+ 2], 23, -995338651);

		a = md5_ii(a, b, c, d, x[i+ 0], 6 , -198630844);
		d = md5_ii(d, a, b, c, x[i+ 7], 10,  1126891415);
		c = md5_ii(c, d, a, b, x[i+14], 15, -1416354905);
		b = md5_ii(b, c, d, a, x[i+ 5], 21, -57434055);
		a = md5_ii(a, b, c, d, x[i+12], 6 ,  1700485571);
		d = md5_ii(d, a, b, c, x[i+ 3], 10, -1894986606);
		c = md5_ii(c, d, a, b, x[i+10], 15, -1051523);
		b = md5_ii(b, c, d, a, x[i+ 1], 21, -2054922799);
		a = md5_ii(a, b, c, d, x[i+ 8], 6 ,  1873313359);
		d = md5_ii(d, a, b, c, x[i+15], 10, -30611744);
		c = md5_ii(c, d, a, b, x[i+ 6], 15, -1560198380);
		b = md5_ii(b, c, d, a, x[i+13], 21,  1309151649);
		a = md5_ii(a, b, c, d, x[i+ 4], 6 , -145523070);
		d = md5_ii(d, a, b, c, x[i+11], 10, -1120210379);
		c = md5_ii(c, d, a, b, x[i+ 2], 15,  718787259);
		b = md5_ii(b, c, d, a, x[i+ 9], 21, -343485551);

		a = safe_add(a, olda);
		b = safe_add(b, oldb);
		c = safe_add(c, oldc);
		d = safe_add(d, oldd);
	}
	return Array(a, b, c, d);
}

/*
 * Encode a string as utf-8.
 * For efficiency, this assumes the input is valid utf-16.
 */
function str2rstr_utf8(input) {
	var output = "";
	var i = -1;
	var x, y;

	while(++i < input.length) {
		/* Decode utf-16 surrogate pairs */
		x = input.charCodeAt(i);
		y = i + 1 < input.length ? input.charCodeAt(i + 1) : 0;
		if(0xD800 <= x && x <= 0xDBFF && 0xDC00 <= y && y <= 0xDFFF) {
			x = 0x10000 + ((x & 0x03FF) << 10) + (y & 0x03FF);
			i++;
		}

		/* Encode output as utf-8 */
		if(x <= 0x7F) {
			output += String.fromCharCode(x);
		} else if(x <= 0x7FF) {
			output += String.fromCharCode(0xC0 | ((x >>> 6 ) & 0x1F),
			                              0x80 | ( x         & 0x3F));
		} else if(x <= 0xFFFF) {
			output += String.fromCharCode(0xE0 | ((x >>> 12) & 0x0F),
			                              0x80 | ((x >>> 6 ) & 0x3F),
			                              0x80 | ( x         & 0x3F));
		} else if(x <= 0x1FFFFF) {
			output += String.fromCharCode(0xF0 | ((x >>> 18) & 0x07),
			                              0x80 | ((x >>> 12) & 0x3F),
			                              0x80 | ((x >>> 6 ) & 0x3F),
			                              0x80 | ( x         & 0x3F));
		}
	}
	return output;
}

/*
 * Calculate the MD5 of a raw string
 */
function rstr_md5(s) {
	return binl2rstr(binl_md5(rstr2binl(s), s.length * 8));
}

/*
 * Convert a raw string to a hex string
 */
function rstr2hex(input) {
	try { hexcase } catch(e) { hexcase=0; }
	var hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
	var output = "";
	var x;
	for(var i = 0; i < input.length; i++) {
		x = input.charCodeAt(i);
		output += hex_tab.charAt((x >>> 4) & 0x0F)
			+ hex_tab.charAt( x & 0x0F);
	}
	return output;
}

/* @public
 * These are the functions you'll usually want to call
 * They take string arguments and return either hex or base-64 encoded strings
 */
window.hex_md5 = function(s) { return rstr2hex(rstr_md5(str2rstr_utf8(s))); }

}());


/*
* Image Switch v1.4: Muestra imágenes al pasar el mouse sobre un enlace que apunte a la imagen a mostrar
* REQUIERE: hex_md5
*
* Copyright (C) 2009  Jesús Martínez Novo ([[User:Ciencia Al Poder]])
* 
* This program is free software; you can redistribute it and/or modify
*   it under the terms of the GNU General Public License as published by
*   the Free Software Foundation; either version 2 of the License, or
*   (at your option) any later version

La estructura que deben seguir los elementos es:
	.imageswitch_section
		.imageswitch_image [imageswitch_scale (mantiene la imagen dentro de las dimensiones, pero conservando la relación de aspecto) | imageswitch_preservewidth (mantiene el ancho) | imageswitch_preserveheight (mantiene el alto) ]
			img
		.imageswitch_links [imageswitch_episodio (especial para plantilla episodio) ]
			a[title^=Archivo:]+

También para episodios, si el contenido del enlace es un texto de 3 cifras y el elemento .imageswitch_links es también .imageswitch_episodio
No puede haber más de 1 elemento de profundidad en a, ni más de 5 de distancia entre .imageswitch_section e .imageswitch_links
*/
(function(){

var fileNS = 'Archivo:';

var k = 'imageswitch_',
	ks = k+'state_',
	kCur = k+'current';

ImageSwitcher = function(){
	this.init();
};

ImageSwitcher.prototype = {
	re: {ep: /\d{3}/},
	targetimgs: [],
	sizecache: {},
	init: function() {
		$UT.addHandler((window.bodyContentId||'bodyContent'), 'mouseover', function(thisArg) {
			return function(e) {
				thisArg.eEnter(e);
			};
		}(this));
	},
	eEnter: function(e) {
		var url = null;
		var link = this.getParentEl($UT.getTarget(e), 'a', 1);
		if (link === null || $UT.hasClass(link, 'image')) return;
		var linkcheck = this.getParentClass(link, k+'links', 2);
		if (linkcheck === null) return;
		if ($UT.hasClass(linkcheck, k+'episodio')) {
			var EPCode = $UT.trim($UT.getInnerText(link));
			if (!this.re.ep.test(EPCode)) return;
			url = this.getWikiImage('EP'+EPCode+'.png');
		} else {
			if ($UT.hasClass(link, 'new') || link.title.toString().indexOf(fileNS) != 0) {
				return;
			}
			url = this.getWikiImage(link.title.replace(fileNS, ''));
		}
		var section = this.getParentClass(linkcheck, k+'section', 6);
		if (section === null) return;
		var ims = section;
		if (!$UT.hasClass(ims, k+'image')) {
			var imgsecs = $UT.getElementsByClassName(k+'image', '*', section);
			if (imgsecs.length == 0) return;
			ims = imgsecs[0];
		}
		var imgs = ims.getElementsByTagName('img');
		if (imgs.length == 0) return;
		var ima = imgs[0];
		if (decodeURI(ima.src) != url) {
			var index = this.setupTarget(ima, ims);
			this.setState('loading', index);
			plink = this.getParentEl(ima, 'a', 1);
			if (plink !== null) {
				plink.href = link.href;
			}
			if (!this.adaptSize(index, url)) {
				setTimeout(function(img, url) {
					return function() {
						img.src = url;
					};
				}(ima,url), 10);
			}
		}
		for (var i = 0, as = $UT.getElementsByClassName(kCur, 'a', linkcheck); i < as.length; i++) {
			as[i].className = $UT.trim((' '+as[i].className+' ').replace(' '+kCur+' ', ''));
		}
		link.className += ' '+kCur;
	},
	getParentEl: function(node, el, max) {
		max = max || 0;
		while (node != null && node.nodeType == 1 && max+1) {
			if (node.tagName.toLowerCase() == el.toLowerCase()) {
				return node;
			}
			node = node.parentNode;
			max--;
		}
		return null;
	},
	getParentClass: function(node, cn, max) {
		max = max || 0;
		while (node != null && node.nodeType == 1 && max+1) {
			if ($UT.hasClass(node, cn)) {
				return node;
			}
			node = node.parentNode;
			max--;
		}
		return null;
	},
	setupTarget: function(imgTarget, imgWrap) {
		for (var i = 0; i < this.targetimgs.length; i++) {
			if ((imgTarget.isSameNode && imgTarget.isSameNode(this.targetimgs[i].node)) || imgTarget === this.targetimgs[i].node) { // DOM || IE
				return i;
			}
		}
		var s = [imgTarget.width,imgTarget.height];
		for (var i = 0, p = ['width', 'height']; i < 2; i++) {
			if (!$UT.hasClass(imgWrap, k+'preserve'+p[i])) {
				imgTarget.removeAttribute(p[i]);
			}
		}
		var preserve = $UT.hasClass(imgWrap, k+'scale');
		var index = this.targetimgs.length;
		this.targetimgs[index] = {
			node:imgTarget,
			state:null,
			wrapper:imgWrap,
			preserve:preserve,
			size:s,
			original:imgTarget.src
		};
		if (preserve) {
			var cont = $UT.create('span', {'class':'imageswitch_imagecontainer'});
			var a = imgTarget.parentNode;
			if (a.tagName.toLowerCase() != 'a') {
				a = imgTarget;
			}
			a.parentNode.insertBefore(cont,a);
			cont.appendChild(a);
			cont.style.width = s[0]+'px';
			cont.style.height = s[1]+'px';
			var loader = new Image();
			$UT.addHandler(loader, 'load', function(thisArg, idx) {
				return function() {
					thisArg.sizeLoader(idx);
				};
			}(this, index));
			$UT.addHandler(loader, 'error', function(thisArg, idx) {
				return function() {
					thisArg.error(idx);
				};
			}(this, index));
			this.targetimgs[index].loader = loader;
		}
		$UT.addHandler(imgTarget, 'load', function(thisArg, idx) {
			return function() {
				thisArg.loaded(idx);
			};
		}(this, index));
		$UT.addHandler(imgTarget, 'error', function(thisArg, idx) {
			return function() {
				thisArg.error(idx);
			};
		}(this, index));
		return index;
	},
	loaded: function(index) {
		this.setState('loaded', index);
	},
	error: function(index) {
		this.setState('error', index);
		var ori = this.targetimgs[index].original;
		var img = this.targetimgs[index].node;
		if (img.src != ori) {
			img.src = ori;
		}
	},
	setState: function(state, index) {
		var node = this.targetimgs[index].wrapper;
		var oldState = this.targetimgs[index].state;
		if (oldState !== null) {
			node.className = $UT.trim((' '+node.className+' ').replace(' '+ks+oldState+' ', ' '+ks+state+' '));
		} else {
			node.className += ' '+ks+state;
		}
		this.targetimgs[index].state = state;
	},
	// Si el modo de imagen es mantener las dimensiones máximas, retorna true si este método se encarga de cambiar la imagen, o false si ya tenemos las dimensiones y se puede cambiar directamente.
	adaptSize: function(index, url) {
		if (!this.targetimgs[index].preserve) return false;
		if (typeof this.sizecache[url] == 'undefined') {
			this.targetimgs[index].loader.src = url;
			return true;
		}
		this.setSize(index, url);
		return false;
	},
	setSize: function(index, url) {
		var img = this.targetimgs[index].node;
		for (var i = 0, p = ['width', 'height']; i < 2; i++) {
			img.removeAttribute(p[i]);
		}
		var ms = this.targetimgs[index].size;
		var s = this.sizecache[url];
		if (s[0] / s[1] > ms[0] / ms[1]) { // La nueva es más horizontal
			img.width = ms[0];
			img.height = parseInt(s[1]*ms[0]/s[0]);
		} else {
			img.height = ms[1];
			img.width = parseInt(s[0]*ms[1]/s[1]);
		}
	},
	sizeLoader: function(index) {
		var loader = this.targetimgs[index].loader;
		var url = loader.src;
		this.sizecache[url] = [loader.width, loader.height];
		this.setSize(index, url);
		this.targetimgs[index].node.src = url;
	},
	getWikiImage: function(title) {
		title = title.replace(/ /g, '_');
		// para pruebas //return wgServer+wgArticlePath.replace('$1', 'Especial:RutaDeArchivo/'+title);
		var mdSrc = window.hex_md5(title);
		return 'http://images.wikia.com/es.pokemon/images/'+mdSrc.substr(0,1)+'/'+mdSrc.substr(0,2)+'/'+title;
	},
};

}());

function ImageSwitcher_loader(){
	new ImageSwitcher();
}

$(ImageSwitcher_loader);
//</pre>
