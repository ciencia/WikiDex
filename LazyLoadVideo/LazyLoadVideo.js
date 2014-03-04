/*
* LazyLoadVideo - Muestra un botón para activar (mostrar) el reproductor de vídeos, para que no se carguen desde el inicio
* Copyright (C) 2012 - 2014 Jesús Martínez Novo ([[User:Ciencia Al Poder]])
* 
* This program is free software; you can redistribute it and/or modify
*   it under the terms of the GNU General Public License as published by
*   the Free Software Foundation; either version 2 of the License, or
*   (at your option) any later version
*/
(function() {

var _title = (window.lazyloadvideotitle || 'Clic para activar el vídeo'),
_thumbUrl = 'http://i1.ytimg.com/vi/{0}/hqdefault.jpg';
_init = function() {
	$('#'+window.bodyContentId).find('div.video > .thumbinner > .youtube > object').each(_muestraThumb);
},
// Agrega una imagen del vídeo en la posición del vídeo
_muestraThumb = function() {
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
		w = oVideo.attr('width'), h = oVideo.attr('height');
		oVideo.parent().append(
			$(document.createElement('img')).attr('src', _thumbUrl.replace('{0}', vid)).attr({width: w, height: h}).addClass('videothumb')).append(
			$('<div class="videodiscoveryoverlay"></div>').css({width: w.concat('px'), height: h.concat('px')}).attr('title', _title).bind('click', _discoverVideo));
	}
},
// Evento al hacer clic en el overlay
_discoverVideo = function(e) {
	var p = $(this).parent(), oVideo = p.find('> object'), mparam;
	// En Safari ya versión 2 ya no funciona, porque redirecciona desde otro dominio y no lo permite por seguridad. Hay que cambiar a la versión 3
	// http://code.google.com/p/gdata-issues/issues/detail?id=4887
	mparam = oVideo.find('> param[name="movie"]');
	oVideo.attr('data', oVideo.attr('data').replace('version=2', 'version=3'));
	mparam.attr('value', mparam.attr('value').replace('version=2', 'version=3'));
	oVideo.css('display', 'inline');
	p.find('> img.videothumb').add(this).unbind().remove();
};

// Muy lazy load
(typeof(window.safeOnLoadHook)=='function'?safeOnLoadHook:$)(function() {
	window.setTimeout(_init, 2000);
});

})();
