/* <pre>
 * SVGDirecto v1.1
 * Copyright (c) 2013 - 2015 Jesús Martínez (User:Ciencia_Al_Poder)
 *
 * Incluye una imagen SVG directamente en la página en vez de la imagen PNG (solo navegadores compatibles)
 * 
 * This program is free software; you can redistribute it and/or modify
 *   it under the terms of the GNU General Public License as published by
 *   the Free Software Foundation; either version 2 of the License, or
 *   (at your option) any later version
*/
var SVGDirecto = (function() {
	'use strict';
	var _hayConversion = false,
	_init = function() {
		if (_soportaSVG()) {
			$('.svg-directo a.image img', '#mw-content-text').each(_convertirImagen);
			if (_hayConversion) {
				_cambiaEstiloCSS();
			}
		}
	},
	_soportaSVG = function() {
		return document.implementation && document.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#Shape", "1.0");
	},
	_convertirImagen = function(idx, img) {
		var $img = $(img), src = ($img.attr('data-src') || $img.attr('src')), urlparts = src.split('/'), lastIndex, svgsrc, $a, $o;
		for (var i = urlparts.length - 2; i >= 0; i--) {
			lastIndex = urlparts[i].lastIndexOf('.');
			if (lastIndex > -1 && urlparts[i].substr(lastIndex + 1).toLowerCase() == 'svg') {
				svgsrc = urlparts.slice(0, i + 1).join('/');
				break;
			}
		}
		if (svgsrc) {
			$a = $img.closest('a');
			$o = $('<object type="image/svg+xml"></object>').attr({'data': svgsrc, width: $img.attr('width')}).append(
				$('<param/>').attr({'name': 'src', 'value': svgsrc}));
			$o.insertBefore($a);
			$o.append($a);
			_hayConversion = true;
		}
	},
	_cambiaEstiloCSS = function() {
		$('.svg-directo span.svg-enabled').css('display', 'inline');
		$('.svg-directo span.svg-disabled').css('display', 'none');
	};

	$(_init);
}());
/* </pre> */