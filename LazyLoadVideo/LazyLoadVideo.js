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
	$('div.video > .youtube', '#mw-content-text').each(_muestraThumb);
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
	p.empty();
	iframe = $('<iframe>').attr({
		'type': 'text/html',
		width: p.css('width'),
		height: p.css('height'),
		src: 'http://www.youtube.com/embed/' + p.data('youtubevid') + '?iv_load_policy=3&rel=0',
		frameborder: '0',
		allowfullscreen: ''
	}).appendTo(p);
};

// Muy lazy load
(typeof(window.safeOnLoadHook)=='function'?window.safeOnLoadHook:$)(function() {
	window.setTimeout(_init, 2000);
});

})(jQuery);
