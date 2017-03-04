/**
* SkinPropagation: Propaga el &useskin= de la URL (siempre que sea posible) por los enlaces y formularios
* Copyright (C) 2010  Jesús Martínez Novo ([[User:Ciencia Al Poder]])
* 
* This program is free software; you can redistribute it and/or modify
*   it under the terms of the GNU General Public License as published by
*   the Free Software Foundation; either version 2 of the License, or
*   (at your option) any later version
*/
window.SkinPropagation = {
	skin: '',
	init: function() {
		if (window.location.href.indexOf('useskin=') == -1) return;
		var url = SkinPropagation.parseURL(window.location.href);
		if (url.query.useskin) {
			SkinPropagation.skin = (url.query.propagateskin || url.query.useskin);
		}
		if (SkinPropagation.skin != '') {
			$(document.body).bind('click.skinpropagation', SkinPropagation.clicEvent);
			$('form').bind('submit.skinpropagation', SkinPropagation.submitEvent);
		}
	},
	parseURL: function(url) {
		var ret = {base:'',qs:'',query:{},hash:''};
		var loc = url.indexOf('#');
		if (loc != -1) {
			ret.hash = url.substr(loc+1);
			url = url.substr(0,loc);
		}
		loc = url.indexOf('?');
		if (loc != -1) {
			ret.qs = url.substr(loc+1);
			url = url.substr(0,loc);
			var paras = ret.qs.split('&');
			for (var i = 0; i < paras.length; i++) {
				var p = paras[i].split('=');
				if (p.length == 2) {
					ret.query[p[0]] = p[1];
				}
			}
		}
		ret.base = url;
		return ret;
	},
	getURL: function(url) {
		var nurl = url.base + '?';
		for (var p in url.query) {
			nurl += p + '=' + url.query[p] + '&';
		}
		nurl = nurl.substr(0,nurl.length-1);
		if (url.hash != '') {
			nurl += '#'+ url.hash;
		}
		return nurl;
	},
	clicEvent: function(e) {
		if (e.target.tagName.toLowerCase() != 'a') return;
		if (e.target.href.indexOf(window.wgServer) != 0) return;
		var url = SkinPropagation.parseURL(e.target.href);
		var thisloc = SkinPropagation.parseURL(window.location.href);
		if (url.base == thisloc.base && url.qs == thisloc.qs && url.hash != '') {
			return;
		}
		if (url.query.useskin && url.query.useskin != SkinPropagation.skin) {
			url.query.propagateskin = SkinPropagation.skin;
		} else {
			url.query.useskin = SkinPropagation.skin;
		}
		e.target.href = SkinPropagation.getURL(url);
	},
	submitEvent: function(e) {
		if (this.action.indexOf(window.wgServer) != 0) return;
		if (this.method == 'post') {
			var url = SkinPropagation.parseURL(this.action);
			url.query.useskin = SkinPropagation.skin;
			this.action = SkinPropagation.getURL(url);
		} else {
			$(this).append('<input type="hidden" name="useskin" value="'+SkinPropagation.skin+'"/>');
		}
	},
	stop: function() {
		$(document.body).unbind('click.skinpropagation');
		$('form').unbind('submit.skinpropagation');
	}
};

$(SkinPropagation.init);

function agregarEnlaceSkin() {
	if (!window.SkinPropagation) return;
	var url = SkinPropagation.parseURL(window.location.href);
	url.query.useskin = 'monobook';
	var surl = SkinPropagation.getURL(url);
	$('#WikiaFooter').children('div.toolbar').eq(0).children('ul').eq(0).append('<li><a href="'+surl+'"><img width="15" height="15" class="monobook-icon" src="'+stylepath+'/common/blank.gif"/></a> <a href="'+surl+'" id="ca-changeskin" title="Ver WikiDex con la piel Monobook">Cambiar la apariencia a Monobook</a></li>');
	
	$('#ca-changeskin').click(function(){
		alert('La apariencia cambiará temporalmente a Monobook. Para ver el estilo por defecto deberás quitar el "useskin=monobook" de la dirección de la página que sale en el navegador');
	});
}

$(agregarEnlaceSkin);