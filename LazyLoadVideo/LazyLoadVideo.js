/*
* LazyLoadVideo - Muestra un botón para activar (mostrar) el reproductor de vídeos, para que no se carguen desde el inicio
* Copyright (C) 2012 - 2015 Jesús Martínez Novo ([[User:Ciencia Al Poder]])
* 
* This program is free software; you can redistribute it and/or modify
*   it under the terms of the GNU General Public License as published by
*   the Free Software Foundation; either version 2 of the License, or
*   (at your option) any later version
*/
(function($) {

var _title = (window.lazyloadvideotitle || 'Clic para activar el vídeo'),
_thumbUrl = 'http://i1.ytimg.com/vi/{0}/hqdefault.jpg',
_init = function() {
	// OBSOLETO
	$('#'+window.bodyContentId).find('div.video > .thumbinner > .youtube > object, div.video > .youtube > object').each(_muestraThumbInObject);
	// NUEVO
	$('#'+window.bodyContentId).find('div.video > .youtube').each(_muestraThumb);
},
// OBSOLETO - Agrega una imagen del vídeo en la posición del vídeo
_muestraThumbInObject = function() {
	var oVideo = $(this), dataUrl = oVideo.find('> param[name="movie"]').attr('value'), vid = null, idx = dataUrl.indexOf('&'), w, h;
	if (idx != -1) {
		dataUrl = dataUrl.substr(0, idx);
		idx = dataUrl.lastIndexOf('/');
		if (idx != -1) {
			vid = dataUrl.substr(idx + 1);
		}
	}
	// Se comprueba que esté oculto, para sincronizar con CSS
	if (vid !== null && oVideo.css('display') == 'none') {
		w = oVideo.attr('width');
		h = oVideo.attr('height');
		oVideo.parent().append(
			$(document.createElement('img')).attr('src', _thumbUrl.replace('{0}', vid)).attr({width: w, height: h}).addClass('videothumb')).append(
			$('<div class="videodiscoveryoverlay"></div>').css({width: w.concat('px'), height: h.concat('px')}).attr('title', _title).bind('click', _discoverVideo));
	}
},
// OBSOLETO - Evento al hacer clic en el overlay
_discoverVideo = function() {
	var p = $(this).parent(), oVideo = p.find('> object'), mparam;
	// En Safari ya versión 2 ya no funciona, porque redirecciona desde otro dominio y no lo permite por seguridad. Hay que cambiar a la versión 3
	// http://code.google.com/p/gdata-issues/issues/detail?id=4887
	mparam = oVideo.find('> param[name="movie"]');
	oVideo.attr('data', oVideo.attr('data').replace('version=2', 'version=3'));
	mparam.attr('value', mparam.attr('value').replace('version=2', 'version=3'));
	oVideo.css('display', 'inline');
	p.find('> img.videothumb').add(this).unbind().remove();
},
// Agrega una imagen del vídeo en la posición del contenedor
_muestraThumb = function() {
	var oDiv = $(this), vid = oDiv.data('youtubevid'), w, h;
	// Se comprueba que esté oculto, para sincronizar con CSS
	if (vid && vid.length == 11 && oDiv.find('> iframe').length === 0) {
		w = oDiv.width().toString();
		h = oDiv.height().toString();
		oDiv.append(
			$('<img class="videothumb">').attr('src', _thumbUrl.replace('{0}', vid)).attr({width: w, height: h})).append(
			$('<div class="videodiscoveryoverlay">').css({width: w.concat('px'), height: h.concat('px')}).attr('title', _title).bind('click', _insertVideo));
	}
},
// Evento al hacer clic en el overlay
_insertVideo = function() {
	var p = $(this).parent(), iframe;
	iframe = $('<iframe>').attr({
		'type': 'text/html',
		width: p.css('width'),
		height: p.css('height'),
		src: 'http://www.youtube.com/embed/' + p.data('youtubevid') + '?iv_load_policy=3&rel=0',
		frameborder: '0',
		allowfullscreen: ''
	}).appendTo(p);
	p.find('> img.videothumb').add(this).unbind().remove();
};

// Muy lazy load
(typeof(window.safeOnLoadHook)=='function'?window.safeOnLoadHook:$)(function() {
	window.setTimeout(_init, 2000);
});

})(jQuery);
