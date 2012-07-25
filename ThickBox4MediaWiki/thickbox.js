/* <pre>
 * Thickbox4MediaWiki v3.0 - Based on Thickbox 3.1 By Cody Lindley (http://www.codylindley.com)
 * Copyright (c) 2010 - 2011 Jesús Martínez (User:Ciencia_Al_Poder), Original Thickbox Copyright (c) 2007 Cody Lindley
 * Licensed under the MIT License: http://www.opensource.org/licenses/mit-license.php
*/
var Thickbox = (function() {
	var _version = '3.0',
	// Dimensiones mínimas
	_minWidth = 210,
	// Margen entre la imagen y el borde de ThickBox
	_imageMarginWidth = 15,
	// Margen mínimo hasta el borde de la ventana. Si se supera la imagen se reducirá
	_minMarginWidth = 30,
	_minMarginHeight = 15,
	// Tiempo de espera para la aparición del loader en ms
	_loaderWait = 0,
	// Internos
	_imgPreloader = null,
	_galleryData = null,
	_galleryIndex = -1,
	_width = null,
	_height = null,
	_getCaption = null,
	_xhr = null,
	_imgTip = null,
	_imgTipTarget = null,
	_imgTipVisible = false,
	_loaderPresent = false,
	_loaderTm = null,
	_events = {},
	_logger = null,
	_tbKind = {NONE: 0, IMAGE: 1, ELEMENT: 2, DIALOG: 3},
	_loaded = false,
	// Funciones privadas
	_init = function() {
		// Se podría haber puesto un evento directamente en cada 'a.image', pero esto es mucho más rápido y eficiente (tarda solo el 20% en FF2) que recorrerse todo el DOM
		$('#'+(window.bodyContentId||'bodyContent')).unbind('click.thickbox').bind('click.thickbox', _triggerEvent).unbind('mouseover.thickbox_imgtip').bind('mouseover.thickbox_imgtip', _imgTipEvent);
	},
	_triggerEvent = function(e) {
		// Si hay alguna tecla especial pulsada, salimos
		if (e.ctrlKey || e.altKey || e.shiftKey) {
			return true;
		}
		var target = e.target;
		if (_isTag(target,'img')) { // Gallery o thumb
			var a = target.parentNode;
			if (!a || !_isTag(a,'a') || !_isClass(a,'image')) {
				return true;
			}
			if (_isClass(target,'thumbimage')) {
				// Es thumb
				a.blur();
				_getCaption = _getCaptionThumb;
				_showImage(a);
				return false;
			}
			// Galería Wikia 2
			if (_isClass(a,'lightbox')) {
				target.blur();
				_getCaption = _getCaptionWikia;
				_galleryData = $(target).parents('div.wikia-gallery').children('span.wikia-gallery-item').children('div.thumb').children('div.gallery-image-wrapper').children('a.lightbox');
				if (_galleryData.length == 0) {
					_galleryData = $(target).parents('div.wikia-gallery').children('div.wikia-gallery-row').children('span.wikia-gallery-item').children('div.thumb').children('div.gallery-image-wrapper').children('a.lightbox');
				}
				if (_galleryData.length == 0) {
					return true;
				}
				_galleryIndex = _galleryData.index(a);
				_showImage(a);
				return false;
			}
			var gb = a.parentNode.parentNode.parentNode;
			// MediaWiki gallery
			if (_isTag(gb,'div') && _isClass(gb,'gallerybox') && _isTag(gb.parentNode,'td')) {
				var t = gb.parentNode.parentNode.parentNode.parentNode;
				if (_isTag(t,'table') && _isClass(t,'gallery')) {
					a.blur();
					_getCaption = _getCaptionMW;
					_galleryData = $(t).find('div.gallerybox').children('div.thumb').find('a.image');
					_galleryIndex = _galleryData.index(a);
					_showImage(a);
					return false;
				}
			}
			// Es thumb genérico
			a.blur();
			_getCaption = _getCaptionEmpty;
			_showImage(a);
			return false;
		} else if (_isTag(target,'a')) {
			var sup = target.parentNode;
			if (!_isTag(sup,'sup') || !_isClass(sup,'reference')) {
				return true;
			}
			target.blur();
			_showElement(target);
			return false;
		}
		return true;
	},
	// Helper and speedy functions
	_isClass = function(el, cn) {
		return ((' '+el.className+' ').indexOf(' '+cn+' ') != -1);
	},
	_isTag = function(el, tn) {
		return (el.tagName.toLowerCase() == tn);
	},
	_startLoader = function() {
		if (_loaderPresent || _loaderTm) {
			return;
		}
		if (_loaderWait == 0) {
			_displayLoader();
		} else {
			setTimeout(_displayLoader, _loaderWait);
		}
	},
	_stopLoader = function() {
		var t = _loaderTm;
		_loaderTm = null;
		if (t) {
			clearTimeout(t);
		}
		if (_loaderPresent) {
			$('#TB_load').remove();
			_loaderPresent = false;
		}
	},
	_displayLoader = function() {
		_loaderPresent = true;
		var t = _loaderTm;
		_loaderTm = null;
		if (t) {
			clearTimeout(t);
		}
		$(document.body).append('<div id="TB_load"></div>');
	},
	// Main functions
	_preload = function() {
		$(document.body).addClass('thickbox_loaded');
		if (_xhr) {
			_xhr.abort();
			_xhr = null;
		}
		$('#TB_overlay').add('#TB_window').add('#TB_load').remove();
		//$('#positioned_elements').append('<div id="TB_overlay"></div><div id="TB_window" class="fixedpos"></div><div id="TB_load"></div>');
		$(document.body).append('<div id="TB_overlay"></div><div id="TB_window" class="fixedpos"></div>');
		$('#TB_overlay').click(_remove);
		_startLoader();
	},
	_showImage = function(elem) {
		try {
			_tbLoaded = _tbKind.IMAGE;
			_preload();
			elem = $(elem);

			var url = elem.children('img').eq(0).attr('src');
			url = _getUrlFromThumb(url);

			var TB_secondLine = '';
			var descUrl = elem.attr('href');
			// hack para oasis:
			if (typeof elem.attr('data-image-name') == 'string') {
				descUrl = wgArticlePath.replace('$1', encodeURIComponent((window.wgFormattedNamespaces ? wgFormattedNamespaces['6'] : 'File:' ) + ':' + elem.attr('data-image-name')).replace(new RegExp('%20', 'g'), '_'));
			}
			var TB_descLink = '<a id="TB_descLink" class="sprite details" href="' + descUrl + '" title="Ir a la página de descripción de la imagen"></a>';
			// Se trata de un gallery?
			if (_galleryIndex != -1) {
				TB_secondLine = '<div id="TB_secondLine">'+
					'<span id="TB_imageCount"></span>'+
					'<span id="TB_prev"><a href="#" title="Ver imagen anterior [A]">&lt; Ant.</a></span>'+
					'<span id="TB_next"><a href="#" title="Ver imagen siguiente [S]">Sig. &gt;</a></span></div>';
			}
			$('#TB_window').append('<div id="TB_closeWindow"><a href="#" id="TB_closeWindowButton" title="Cerrar [ESC]">cerrar</a></div><div id="TB_ImageOff"><img id="TB_Image" alt="Imagen" title="Cerrar" />' + TB_descLink + '</div>' + TB_secondLine + '<div id="TB_caption"></div>');
			if (_galleryIndex != -1) {
				_updateNavigation();
			}
			$('#TB_caption').html(_getCaption(elem));

			$('#TB_Image').add('#TB_closeWindowButton').click(_remove);
			$(document).bind('keyup.thickbox', _keyListener);
			$('#TB_prev').add('#TB_next').click(_navigate);
			$('#TB_ImageOff').bind('mouseover', function() {$('#TB_descLink').css('display','block');}).bind('mouseout', function() {$('#TB_descLink').css('display','none');});

			if (_imgPreloader === null) {
				_imgPreloader = new Image();
			}
			_imgPreloader.onload = _imageLoaded;
			_imgPreloader.onerror = _imageError;
			_imgPreloader.src = url;

		} catch(e) {
			_log(e);
		}
	},
	_showElement = function(target) {
		try {
			var url = target.href, idx = url.indexOf('#');
			if (idx == -1) {
				return false;
			}
			var baseurl = url.substr(0, idx),
				hash = url.substr(idx + 1),
				// Comprobamos que la URL sea del mismo documento
				locbase = document.location.href.replace(baseurl, ''),
				rel = document.getElementById(hash);
			if ((locbase != '' && locbase.indexOf('#') != 0) || rel === null) {
				return false;
			}

			_tbLoaded = _tbKind.ELEMENT;
			$('#TB_overlay').add('#TB_window').remove();
			//$('#positioned_elements').append('<div id="TB_overlay" class="transparent"></div><div id="TB_window"></div>');
			$(document.body).append('<div id="TB_overlay" class="transparent"></div><div id="TB_window"></div>');
			$('#TB_overlay').click(_remove);

			var titleHTML = '<div id="TB_title"><div id="TB_closeAjaxWindow"><a href="#" id="TB_closeWindowButton" title="Cerrar [ESC]">cerrar</a></div></div>',
				wnd = $('#TB_window'),
				cel = $(rel).clone();
			cel.contents().eq(0).remove();
			cel.children('sup').remove();
			wnd.width(_minWidth).append(titleHTML+'<div id="TB_ajaxContent">'+cel.html()+'</div>');

			var tgEl = $(target),
				// espacio horizontal a cada lado del elemento
				elOffset = tgEl.offset(),
				lw = elOffset.left,
				rw = $(document).width() - elOffset.left - tgEl.width(),
				// Calculamos las dimensiones óptimas. Calculamos el área y determinamos que lo ideal es proporción 3/2
				prefw = parseInt(Math.sqrt(wnd.width()*wnd.height()*3/2),10),
				// Corrección de ancho mínimo en caso de producirse scroll
				cd = $('#TB_ajaxContent')[0];
			prefw += cd.scrollWidth-cd.clientWidth;
			// No se debe reducir el ancho mínimo
			if (prefw < _minWidth) {
				prefw = _minWidth;
			}
			// Posición. 5px de margen respecto el origen. Situación ideal: a la derecha del elemento
			var margen = 5, left = $(document).width() - rw + margen;
			if (rw > prefw + margen) {
				// ya es correcto
			} else if (lw > prefw + margen) {
				left = lw - prefw - margen;
			} else if (lw < 250 || rw < 250) { // No cabe en ninguno de los dos lados. Miramos si no puede usarse el ancho mínimo (250). En ese caso el ancho lo forzamos y lo ponemos a la derecha
				prefw = 250;
			} else if (rw > lw) { // Se usa el ancho disponible del lado mayor
				prefw = rw - margen;
			} else {
				prefw = lw - margen*2;
				left = margen;
			}
			wnd.css({width: prefw, left: left});
			// Ahora la posición vertical. necesita que hayamos asignado el width para que lo calcule bien
			var top = elOffset.top - parseInt(wnd.height(), 10) - margen;
			// Si no cabe arriba lo colocamos debajo
			if (top < margen) {
				top = elOffset.top + tgEl.height() + margen;
			}
			wnd.css({top: top, visibility: 'visible'});
			// Animación si queda fuera del campo visual
			if (($('html')[0].scrollTop||$('body')[0].scrollTop) > top-margen) {
				$('html,body').animate({scrollTop: top-margen}, 250, 'swing');
			}

			$('#TB_closeWindowButton').click(_remove);
			$(document).bind('keyup.thickbox', _keyListener);
		} catch(e) {
			_log(e);
		}
	},
	_showPage = function(page, width) {
		try {
			_tbLoaded = _tbKind.DIALOG;
			_preload();
			_xhr = $.getJSON(wgScriptPath+'/api.php?action=parse&page='+encodeURIComponent(page)+'&prop=text&format=json', function(width) {
				return function(data) {
					_xhr = null;
					_showDialog(data.parse.text['*'], {width: (width||$(document).width()*0.75)});
				};
			}(width));
		} catch(e) {
			_log(e);
		}
	},
	_showDialog = function(content, options) {
		try {
			_tbLoaded = _tbKind.DIALOG;
			options = (options || {});
			var w = $('#TB_window'),
				width = (options.width || 500),
				texts = (options.texts || {});
			if (!$('#TB_ajaxContent').exists()) {
				_preload();
				w = $('#TB_window').width(width).append('<div id="TB_title"><div id="TB_closeAjaxWindow"><a href="#" id="TB_closeWindowButton" title="Cerrar [ESC]">cerrar</a></div></div><div id="TB_ajaxContent">'+content+'</div>')
					.bind('unload', function() {
						$('#TB_window').find('input').unbind();
					});
				$('#TB_closeWindowButton').click(_remove);
				$(document).bind('keyup.thickbox', _keyListener);
			} else {
				w.width(width);
				$('#TB_ajaxContent').html(content);
			}
			for (var elid in texts) {
				if (typeof texts[elid] == 'string') {
					ac.find('[data-text="'+elid+'"]').text(texts[elid]).removeAttr('data-text');
				}
			}
			var h = w.height(), mh = $(window).height() - (_minMarginHeight*2), ac = $('#TB_ajaxContent');
			if (h > mh) {
				ac.height(mh - h + ac.height());
			}
			_width = width;
			_height = w.height();
			_position();
			_displayClean();
		} catch(e) {
			_log(e);
		}
	},
	//helper functions below
	_displayClean = function() {
		_stopLoader();
		$('#TB_window').css('visibility','visible');
	},
	_remove = function() {
		$(document).unbind('keyup.thickbox');
		_galleryData = null;
		_galleryIndex = -1;
		if (_imgPreloader !== null) {
			_imgPreloader.onload = null;
			_imgPreloader.onerror = null;
		}
		$('#TB_ImageOff').add('#TB_Image').add('#TB_closeWindowButton').add('#TB_prev').add('#TB_next').unbind();
		$('#TB_window').add('#TB_Image').queue('fx',[]).stop();
		_trigger('unload');
		_clearEvents('unload');
		$('#TB_window').fadeOut('fast',function(){$('#TB_window').add('#TB_overlay').unbind().remove();});
		_stopLoader();
		$(document.body).removeClass('thickbox_loaded');
		return false;
	},
	_keyListener = function(e) {
		var keycode = e.which;
		if(keycode == 27) { // close
			_remove();
		} else if(keycode == 65) { // 'A' display previous image
			$('#TB_prev').click();
		} else if(keycode == 83) { // 'S' display next image
			$('#TB_next').click();
		}
	},
	_position = function(anim) {
		// Ancho mínimo
		var border = 4;
		if (_width < _minWidth) {
			_width = _minWidth;
		}
		var o = {marginLeft: '-' + parseInt((_width / 2)+border,10).toString() + 'px', width: _width + 'px', marginTop: '-' + parseInt((_height / 2)+border,10).toString() + 'px'};
		if (anim) {
			$('#TB_window').animate(o, {queue: false, duration: 'fast'});
		} else {
			$('#TB_window').css(o);
		}
	},
	_getPageSize = function() {
		var de = document.documentElement,
			w = window.innerWidth || (de&&de.clientWidth) || document.body.clientWidth,
			h = window.innerHeight || (de&&de.clientHeight) || document.body.clientHeight;
		return [w,h];
	},
	_getUrlFromThumb = function(thumb) {
		// Si la imagen no es thumb, o bien es un SVG, usamos la imagen tal cual.
		if (thumb.indexOf('/thumb/') == -1 || thumb.indexOf('.svg/') != -1 ) {
			return thumb;
		}
		var urlparts = thumb.split('/');
		return thumb.replace('/thumb/','/').replace('/'+urlparts[urlparts.length-1], '');
	},
	_getCaptionThumb = function(elem) {
		return elem.parents('div.thumbinner').children('div.thumbcaption').clone().children('div.magnify').remove().end().html();
	},
	_getCaptionEmpty = function(elem) {
		return $('<div></div>').text((elem.attr('title')||'')).html();
	},
	_getCaptionMW = function(gitem) {
		return gitem.parents('div.gallerybox').eq(0).children('div.gallerytext').eq(0).html();
	},
	_getCaptionWikia = function(gitem) {
		return gitem.parents('span.wikia-gallery-item').eq(0).children('div.lightbox-caption').eq(0).html();
	},
	_imageError = function() {
	},
	_imageLoaded = function() {

		var navigation = (_galleryIndex != -1),
			img = $('#TB_Image'),
			wndH = $('#TB_window').height(),
			// Resizing large images - orginal by Christian Montoya edited by me.
			pagesize = _getPageSize(),
			// Dimensiones máximas
			x = pagesize[0] - _minMarginWidth * 2 - _imageMarginWidth * 2,
			y = pagesize[1] - _minMarginHeight * 2 - wndH + img.height(),
			imageWidth = _imgPreloader.width,
			imageHeight = _imgPreloader.height;
		// Puede entrar por una o por las dos. De hecho, con esta comprobación basta, ya que si tiene que pasar por las dos da igual por qué lado se reduzca primero
		if (imageWidth > x) {
			imageHeight = imageHeight * (x / imageWidth);
			imageWidth = x;
		}
		if (imageHeight > y) {
			imageWidth = imageWidth * (y / imageHeight);
			imageHeight = y;
		}
		// End Resizing

		var firstNav = (img.attr('src') || '') == '';

		// Dimensiones de la ventana Thickbox para posicionar
		_width = imageWidth + _imageMarginWidth * 2; // 15px de espacio en cada lado
		// La altura de la ventana la conocemos. Solo hay que reemplazar la imagen antigua y poner la nueva, esto es, sus dimensiones. El height se tiene que hacer diferente porque intervienen más elementos que en el ancho
		_height = wndH - img.height() + imageHeight;
		img.attr({
			src: _imgPreloader.src,
			alt: $('#TB_caption').text()
		});

		var imgOpt = {width: imageWidth, height: imageHeight, opacity: 1};
		// Miramos si se carga al abrir o después de navegar. Si viene de abrirse, sin animación
		if (firstNav) {
			img.css(imgOpt);
		} else {
			img.animate(imgOpt, {duration: 'fast'});
		}

		_position(navigation && !firstNav);
		_displayClean();
	},
	_updateNavigation = function() {
		var seq = _galleryIndex, len = _galleryData.length;
		$('#TB_prev').css('display', (seq == 0 ? 'none' : ''));
		$('#TB_next').css('display', (seq >= len-1 ? 'none' : ''));
		$('#TB_imageCount').text('Imagen ' + (seq+1) + ' de ' + len);
	},
	_navigate = function() {
		var seq = _galleryIndex + (this.id == 'TB_prev' ? -1 : 1), len = _galleryData.length;
		if (seq < 0 || seq > len - 1) {
			return false;
		}
		_galleryIndex = seq;
		var gitem = _galleryData.eq(seq), url = _getUrlFromThumb(gitem.children('img').eq(0).attr('src'));
		_updateNavigation();
		if (_imgPreloader.src != url) {
			$('#TB_window').stop();
			$('#TB_Image').queue('fx',[]).stop().animate({opacity: 0}, {duration: 'fast', complete: function() {
				_startLoader();
				_imgPreloader.src = url;
			}});
		}
		$('#TB_caption').html(_getCaption(gitem));
		$('#TB_descLink').attr('href',gitem.attr('href'));
		return false;
	},
	_setParams = function(p) {
		if (typeof p != 'object') {
			return;
		}
		for (var n in p) {
			var val = p[n];
			switch(n) {
				case 'minWidth':
					_minWidth = val;
					break;
				case 'imageMarginWidth':
					_imageMarginWidth = val;
					break;
				case 'minMarginWidth':
					_minMarginWidth = val;
					break;
				case 'minMarginHeight':
					_minMarginHeight = val;
					break;
				case 'loaderWait':
					_loaderWait = (typeof val == 'number' && val);
					break;
				case 'logger':
					_logger = (typeof val == 'function' && val);
					break;
			}
		}
	},
	// Asigna una función a un evento interno. El tipo de evento puede tener un nombre (separado por un punto) para poder desasociarlo
	_bind = function(event, fn) {
		var parts = event.split('.'), ty = '', nm = '';
		ty = parts[0];
		if (parts.length > 1) {
			nm = parts[1];
		}
		if (!_events[ty]) {
			_events[ty] = [];
		}
		for (var i = 0; i < _events[ty].length; i++) {
			if (_events[ty][i][0] == name) {
				_events[ty][i][1] = fn;
				return;
			}
		}
		_events[ty].push([name, fn]);
	},
	// Desasigna una función a un evento interno
	_unbind = function(event) {
		var parts = event.split('.'), ty = '', nm = '';
		ty = parts[0];
		if (parts.length == 1 || !_events[ty]) {
			return
		}
		for (var i = 0; i < _events[ty].length; i++) {
			if (_events[ty][i][0] == name) {
				_events[ty][i][1] = false;
				return;
			}
		}
	},
	// Ejecuta las funciones asignadas a un evento interno
	_trigger = function(ty) {
		if (!_events[ty]) {
			return;
		}
		for (var i = 0; i < _events[ty].length; i++) {
			try {
				var f = _events[ty][i][1];
				if (f) {
					f();
				}
			} catch(e) {}
		}
	},
	// Borra todas las funciones asignadas al evento interno
	_clearEvents = function(ty) {
		try {
			delete _events[ty];
		} catch(e) {
			_events[ty] = false;
		}
	},
	_log = function(msg) {
		if (_logger) {
			_logger(msg);
		}
	},
	_imgTipEvent = function(e) {
		if (e.ctrlKey || e.altKey || e.shiftKey) {
			return _hideImgTip();
		}
		var target = e.target;
		if (_isTag(target,'img')) { // Gallery o thumb
			var a = target.parentNode;
			if (!_isTag(a,'a') || !_isClass(a,'image')) {
				return _hideImgTip();
			}
			var t = $(target);
			// Mostramos solo si la imagen tiene un tamaño mínimo
			if (t.width() < 40 || t.height() < 40) {
				return;
			}
			return _showImgTip(t);
		}
		_hideImgTip();
	},
	_imgTipClickEvent = function() {
		if (_imgTipTarget) {
			$(_imgTipTarget).click();
			return false;
		}
	},
	_createImgTip = function() {
		//_imgTip = $('<div id="TB_imagetip" title="Clic sobre la imagen para ampliar. Ctrl, Alt o Mayús. para acceder a la página de descripción de la imagen."></div>').appendTo('#positioned_elements');
		_imgTip = $('<div id="TB_imagetip" title="Clic sobre la imagen para ampliar. Ctrl, Alt o Mayús. para acceder a la página de descripción de la imagen."></div>').appendTo(document.body);
		_imgTip.bind('click',_imgTipClickEvent);
	},
	_showImgTip = function(target) {
		if (!_imgTip) {
			_createImgTip();
		}
		var of = target.offset();
		_imgTip.css({
			display: 'block',
			left: of.left + target.width(),
			top: of.top + target.height()
		});
		_imgTipVisible = true;
		_imgTipTarget = target;
	},
	_hideImgTip = function() {
		if (_imgTipVisible) {
			_imgTip.css('display','none');
			_imgTipVisible = false;
			_imgTipTarget = null;
		}
	};

	// Public functions
	return {
		init: _init,
		showImage: _showImage,
		showElement: _showElement,
		showPage: _showPage,
		showDialog: _showDialog,
		remove: _remove,
		bind: _bind,
		unbind: _unbind,
		setParams: _setParams
	};

}());

if (wgAction != 'history' || !(wgNamespaceNumber == -1 && wgCanonicalSpecialPageName == 'Recentchanges')) {
	$(Thickbox.init);
}
/* </pre> */
