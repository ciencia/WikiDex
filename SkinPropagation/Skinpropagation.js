/**
* SkinPropagation: Propaga el &useskin= de la URL (siempre que sea posible) por los enlaces y formularios
* Copyright (C) 2010-2017  Jesús Martínez Novo ([[User:Ciencia Al Poder]])
* 
* This program is free software; you can redistribute it and/or modify
*   it under the terms of the GNU General Public License as published by
*   the Free Software Foundation; either version 2 of the License, or
*   (at your option) any later version
*/
(function($, mw) {
	'use strict';
	var _skin = '',
	_init = function() {
		var url;
		if (window.location.href.indexOf('useskin=') == -1) return;
		url = _parseURL(window.location.href);
		// Si existe propagateskin, se propagará este en los siguientes enlaces en lugar del useskin (p.ej. enlaces para 
		if (url.query.useskin) {
			_skin = (url.query.propagateskin || url.query.useskin);
		}
		if (!_skin) {
			$(document.body).bind('click.skinpropagation', _clicEvent);
			$('form').bind('submit.skinpropagation', _submitEvent);
		}
	},
	_parseURL = function(url) {
		var ret = { base:'', qs:'', query: {}, hash: '' }, loc = url.indexOf('#'), paras, i, p;
		if (loc != -1) {
			ret.hash = url.substr(loc + 1);
			url = url.substr(0, loc);
		}
		loc = url.indexOf('?');
		if (loc != -1) {
			ret.qs = url.substr(loc + 1);
			url = url.substr(0, loc);
			paras = ret.qs.split('&');
			for (i = 0; i < paras.length; i++) {
				p = paras[i].split('=');
				if (p.length == 2) {
					ret.query[p[0]] = p[1];
				}
			}
		}
		ret.base = url;
		return ret;
	},
	_getURL = function(url) {
		var nurl, p;
		nurl = url.base + '?';
		for (p in url.query) {
			if (url.query.hasOwnProperty(p) && (url.query[p] || url.query[p] === '')) {
				nurl += p + '=' + url.query[p] + '&';
			}
		}
		nurl = nurl.substr(0, nurl.length - 1);
		if (url.hash) {
			nurl += '#' + url.hash;
		}
		return nurl;
	},
	_clicEvent = function(e) {
		var url, thisloc;
		if (e.target.tagName.toLowerCase() != 'a') return;
		if (e.target.href.indexOf(mw.config.get('wgServer')) !== 0) return;
		url = _parseURL(e.target.href);
		thisloc = _parseURL(window.location.href);
		// Si es enlace a sección, no hacer nada
		if (url.base == thisloc.base && url.qs == thisloc.qs && url.hash) {
			return;
		}
		if (url.query.useskin && url.query.useskin != _skin) {
			url.query.propagateskin = _skin;
		} else {
			url.query.useskin = _skin;
		}
		e.target.href = _getURL(url);
	},
	_submitEvent = function(e) {
		var url;
		if (this.action.indexOf(mw.config.get('wgServer')) !== 0) return;
		if (this.method.toLowerCase() == 'post') {
			url = _parseURL(this.action);
			url.query.useskin = _skin;
			this.action = _getURL(url);
		} else {
			$('<input type="hidden" name="useskin">').val(_skin).appendTo(this);
		}
	},
	_addUseSkin = function(url, skin) {
		var nurl = _parseURL(url);
		nurl.query.useskin = skin;
		nurl.query.propagateskin = false;
		return _getURL(nurl);
	};

	window.SkinPropagation = {
		addUseSkin: _addUseSkin
	};

	$(_init);

})(jQuery, mw);
