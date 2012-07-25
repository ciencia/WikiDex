/* <pre>
 * Thickbox4MediaWiki v2.1 - Based on Thickbox 3.1 By Cody Lindley (http://www.codylindley.com)
 * Copyright (c) 2010 Jesús Martínez (User:Ciencia_Al_Poder), Original Thickbox Copyright (c) 2007 Cody Lindley
 * Licensed under the MIT License: http://www.opensource.org/licenses/mit-license.php
*/
var Thickbox = {
	version: '2.1',
	// Dimensiones mínimas
	minWidth: 210,
	// Margen entre la imagen y el borde de ThickBox
	imageMarginWidth: 15,
	// Margen mínimo hasta el borde de la ventana. Si se supera la imagen se reducirá
	minMarginWidth: 30,
	minMarginHeight: 15,
	// Internos
	imgPreloader: null,
	galleryData: null,
	galleryIndex: -1,
	width: null,
	height: null,
	getCaption: null,
	xhr: null,
	imgTip: null,
	imgTipTarget: null,
	imgTipVisible: false,
	init: function() {
		// Se podría haber puesto un evento directamente en cada 'a.image', pero esto es mucho más rápido y eficiente (tarda solo el 20% en FF2) que recorrerse todo el DOM
		$('#'+(window.bodyContentId||'bodyContent')).bind('click.thickbox', Thickbox.triggerEvent).bind('mouseover.thickbox_imgtip', Thickbox.imgTipEvent);
	},
	triggerEvent: function(e) {
		if (e.ctrlKey || e.altKey || e.shiftKey) {
			return true;
		}
		var target = e.target;
		if (Thickbox.isTag(target,'img')) { // Gallery o thumb
			var a = target.parentNode;
			if (!a || !Thickbox.isTag(a,'a') || !Thickbox.isClass(a,'image')) {
				return true;
			}
			if (Thickbox.isClass(target,'thumbimage')) {
				// Es thumb
				a.blur();
				Thickbox.getCaption = Thickbox.getCaptionThumb;
				Thickbox.showImage(a);
				return false;
			}
			// Galería Wikia 2
			if (Thickbox.isClass(a,'lightbox')) {
				target.blur();
				Thickbox.getCaption = Thickbox.getCaptionWikia;
				Thickbox.galleryData = $(target).parents('div.wikia-gallery').children('span.wikia-gallery-item').children('div.thumb').children('div.gallery-image-wrapper').children('a.lightbox');
				if (Thickbox.galleryData.length == 0) {
					Thickbox.galleryData = $(target).parents('div.wikia-gallery').children('div.wikia-gallery-row').children('span.wikia-gallery-item').children('div.thumb').children('div.gallery-image-wrapper').children('a.lightbox');
				}
				if (Thickbox.galleryData.length == 0) {
					return true;
				}
				Thickbox.galleryIndex = Thickbox.galleryData.index(a);
				Thickbox.showImage(a);
				return false;
			}
			var gb = a.parentNode.parentNode.parentNode;
			// MediaWiki gallery
			if (Thickbox.isTag(gb,'div') && Thickbox.isClass(gb,'gallerybox') && Thickbox.isTag(gb.parentNode,'td')) {
				var t = gb.parentNode.parentNode.parentNode.parentNode;
				if (Thickbox.isTag(t,'table') && Thickbox.isClass(t,'gallery')) {
					a.blur();
					Thickbox.getCaption = Thickbox.getCaptionMW;
					Thickbox.galleryData = $(t).find('div.gallerybox').children('div.thumb').find('a.image');
					Thickbox.galleryIndex = Thickbox.galleryData.index(a);
					Thickbox.showImage(a);
					return false;
				}
			}
			// Es thumb genérico
			a.blur();
			Thickbox.getCaption = Thickbox.getCaptionEmpty;
			Thickbox.showImage(a);
			return false;
		} else if (Thickbox.isTag(target,'a')) {
			var sup = target.parentNode;
			if (!Thickbox.isTag(sup,'sup') || !Thickbox.isClass(sup,'reference')) {
				return true;
			}
			target.blur();
			Thickbox.showElement(target);
			return false;
		}
		return true;
	},
	// Helper and speedy functions
	isClass: function(el, cn) {
		return ((' '+el.className+' ').indexOf(' '+cn+' ') != -1);
	},
	isTag: function(el, tn) {
		return (el.tagName.toLowerCase() == tn);
	},
	// Main functions
	preload: function() {
		$(document.body).addClass('thickbox_loaded');
		if (Thickbox.xhr) {
			Thickbox.xhr.abort();
			Thickbox.xhr = null;
		}
		$('#TB_overlay').add('#TB_window').add('#TB_load').remove();
		$('#positioned_elements').append('<div id="TB_overlay"></div><div id="TB_window" class="fixedpos"></div><div id="TB_load"></div>');
		$('#TB_overlay').click(Thickbox.remove);
		$('#TB_load').show();//show loader
	},
	showImage: function(elem) {
		try {
			Thickbox.preload();
			elem = $(elem);

			var url = elem.children('img').eq(0).attr('src');
			url = Thickbox.getUrlFromThumb(url);

			var TB_secondLine = '';
			var descUrl = elem.attr('href');
			// hack para oasis:
			if (typeof elem.attr('data-image-name') == 'string') {
				descUrl = wgArticlePath.replace('$1', encodeURIComponent((window.wgFormattedNamespaces ? wgFormattedNamespaces['6'] : 'File:' ) + ':' + elem.attr('data-image-name')).replace(new RegExp('%20', 'g'), '_'));
			}
			var TB_descLink = '<a id="TB_descLink" class="sprite details" href="' + descUrl + '" title="Ir a la página de descripción de la imagen"></a>';
			// Se trata de un gallery?
			if (Thickbox.galleryIndex != -1) {
				TB_secondLine = '<div id="TB_secondLine">'+
					'<span id="TB_imageCount"></span>'+
					'<span id="TB_prev"><a href="#" title="Ver imagen anterior [A]">&lt; Ant.</a></span>'+
					'<span id="TB_next"><a href="#" title="Ver imagen siguiente [S]">Sig. &gt;</a></span></div>';
			}
			$('#TB_window').append('<div id="TB_closeWindow"><a href="#" id="TB_closeWindowButton" title="Cerrar [ESC]">cerrar</a></div><div id="TB_ImageOff"><img id="TB_Image" alt="Imagen" title="Cerrar" />' + TB_descLink + '</div>' + TB_secondLine + '<div id="TB_caption"></div>');
			if (Thickbox.galleryIndex != -1) {
				Thickbox.updateNavigation();
			}
			$('#TB_caption').html(Thickbox.getCaption(elem));

			$('#TB_Image').add('#TB_closeWindowButton').click(Thickbox.remove);
			$(document).bind('keyup.thickbox', Thickbox.keyListener);
			$('#TB_prev').add('#TB_next').click(Thickbox.navigate);
			$('#TB_ImageOff').bind('mouseover', function() {$('#TB_descLink').css('display','block');}).bind('mouseout', function() {$('#TB_descLink').css('display','none');});

			if (Thickbox.imgPreloader === null) {
				Thickbox.imgPreloader = new Image();
			}
			Thickbox.imgPreloader.onload = Thickbox.imageLoaded;
			Thickbox.imgPreloader.onerror = Thickbox.imageError;
			Thickbox.imgPreloader.src = url;

		} catch(e) {
			Thickbox.error = e;
		}
	},
	showElement: function(target) {
		try {
			var url = target.href;
			if (url.indexOf('#') == -1) {
				return false;
			}
			var baseurl = url.split('#')[0];
			var hash = url.split('#')[1];
			// Comprobamos que la URL sea del mismo documento
			var locbase = document.location.href.replace(baseurl, '');
			var rel = document.getElementById(hash);
			if ((locbase != '' && locbase.indexOf('#') != 0) || rel === null) {
				return false;
			}
			var inlineEl = $(rel);

			$('#TB_overlay').add('#TB_window').remove();
			$('#positioned_elements').append('<div id="TB_overlay" class="transparent"></div><div id="TB_window"></div>');
			$('#TB_overlay').click(Thickbox.remove);

			var titleHTML = '<div id="TB_title"><div id="TB_closeAjaxWindow"><a href="#" id="TB_closeWindowButton" title="Cerrar [ESC]">cerrar</a></div></div>';
			var wnd = $('#TB_window');
			var cel = inlineEl.clone();
			cel.contents().eq(0).remove();
			cel.children('sup').remove();
			wnd.width(Thickbox.minWidth).append(titleHTML+'<div id="TB_ajaxContent">'+cel.html()+'</div>');

			var tgEl = $(target);
			// espacio horizontal a cada lado del elemento
			var elOffset = tgEl.offset();
			var lw = elOffset.left;
			var rw = $(document).width() - elOffset.left - tgEl.width();
			// Calculamos las dimensiones óptimas. Calculamos el área y determinamos que lo ideal es proporción 3/2
			var prefw = parseInt(Math.sqrt(wnd.width()*wnd.height()*3/2),10);
			// Corrección de ancho mínimo en caso de producirse scroll
			var cd = $('#TB_ajaxContent')[0];
			prefw += cd.scrollWidth-cd.clientWidth;
			// No se debe reducir el ancho mínimo
			if (prefw < Thickbox.minWidth) {
				prefw = Thickbox.minWidth;
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

			$('#TB_closeWindowButton').click(Thickbox.remove);
			$(document).bind('keyup.thickbox', Thickbox.keyListener);
		} catch(e) {
			Thickbox.error = e;
		}
	},
	showPage: function(page, width) {
		try {
			Thickbox.preload();
			Thickbox.xhr = $.getJSON(wgScriptPath+'/api.php?action=parse&page='+encodeURIComponent(page)+'&prop=text&format=json', function(width) {
				return function(data) {
					Thickbox.xhr = null;
					Thickbox.showDialog(data.parse.text['*'], {width: (width||$(document).width()*0.75)});
				};
			}(width));
		} catch(e) {
			Thickbox.error = e;
		}
	},
	showDialog: function(content, options) {
		try {
			options = (options || {});
			var w = $('#TB_window'),
				width = (options.width || 500),
				texts = (options.texts || {});
			if (!$('#TB_ajaxContent').exists()) {
				Thickbox.preload();
				w = $('#TB_window').width(width).append('<div id="TB_title"><div id="TB_closeAjaxWindow"><a href="#" id="TB_closeWindowButton" title="Cerrar [ESC]">cerrar</a></div></div><div id="TB_ajaxContent">'+content+'</div>')
					.bind('unload', function() {
						$('#TB_window').find('input').unbind();
					});
				$('#TB_closeWindowButton').click(Thickbox.remove);
				$(document).bind('keyup.thickbox', Thickbox.keyListener);
			} else {
				w.width(width);
				$('#TB_ajaxContent').html(content);
			}
			for (var elid in texts) {
				if (typeof texts[elid] == 'string') {
					ac.find('[data-text="'+elid+'"]').text(texts[elid]).removeAttr('data-text');
				}
			}
			var h = w.height(), mh = $(window).height() - (Thickbox.minMarginHeight*2), ac = $('#TB_ajaxContent');
			if (h > mh) {
				ac.height(mh - h + ac.height());
			}
			Thickbox.width = width;
			Thickbox.height = w.height();
			Thickbox.position();
			Thickbox.displayClean();
		} catch(e) {
			Thickbox.error = e;
		}
	},
	//helper functions below
	displayClean: function() {
		$('#TB_load').remove();
		$('#TB_window').css('visibility','visible');
	},
	remove: function() {
		$(document).unbind('keyup.thickbox');
		Thickbox.galleryData = null;
		Thickbox.galleryIndex = -1;
		if (Thickbox.imgPreloader !== null) {
			Thickbox.imgPreloader.onload = null;
			Thickbox.imgPreloader.onerror = null;
		}
		$('#TB_ImageOff').add('#TB_Image').add('#TB_closeWindowButton').add('#TB_prev').add('#TB_next').unbind();
		$('#TB_window').add('#TB_Image').queue('fx',[]).stop();
		$('#TB_window').trigger('unload').fadeOut('fast',function(){$('#TB_window').add('#TB_overlay').unbind().remove();});
		$('#TB_load').remove();
		$(document.body).removeClass('thickbox_loaded');
		return false;
	},
	keyListener: function(e) {
		var keycode = e.which;
		if(keycode == 27) { // close
			Thickbox.remove();
		} else if(keycode == 65) { // 'A' display previous image
			$('#TB_prev').click();
		} else if(keycode == 83) { // 'S' display next image
			$('#TB_next').click();
		}
	},
	position: function(anim) {
		// Ancho mínimo
		var border = 4;
		if (Thickbox.width < Thickbox.minWidth) {
			Thickbox.width = Thickbox.minWidth;
		}
		var o = {marginLeft: '-' + parseInt((Thickbox.width / 2)+border,10).toString() + 'px', width: Thickbox.width + 'px', marginTop: '-' + parseInt((Thickbox.height / 2)+border,10).toString() + 'px'};
		if (anim) {
			$('#TB_window').animate(o, {queue: false, duration: 'fast'});
		} else {
			$('#TB_window').css(o);
		}
	},
	getPageSize: function() {
		var de = document.documentElement;
		var w = window.innerWidth || (de&&de.clientWidth) || document.body.clientWidth;
		var h = window.innerHeight || (de&&de.clientHeight) || document.body.clientHeight;
		return [w,h];
	},
	getUrlFromThumb: function(thumb) {
		// Si la imagen no es thumb, o bien es un SVG, usamos la imagen tal cual.
		if (thumb.indexOf('/thumb/') == -1 || thumb.indexOf('.svg/') != -1 ) {
			return thumb;
		}
		var urlparts = thumb.split('/');
		return thumb.replace('/thumb/','/').replace('/'+urlparts[urlparts.length-1], '');
	},
	getCaptionThumb: function(elem) {
		return elem.parents('div.thumbinner').children('div.thumbcaption').clone().children('div.magnify').remove().end().html();
	},
	getCaptionEmpty: function(elem) {
		return $('<div></div>').text((elem.attr('title')||'')).html();
	},
	getCaptionMW: function(gitem) {
		return gitem.parents('div.gallerybox').eq(0).children('div.gallerytext').eq(0).html();
	},
	getCaptionWikia: function(gitem) {
		return gitem.parents('span.wikia-gallery-item').eq(0).children('div.lightbox-caption').eq(0).html();
	},
	imageError: function() {
	},
	imageLoaded: function() {

		var navigation = (Thickbox.galleryIndex != -1);
		var img = $('#TB_Image');
		var wndH = $('#TB_window').height();

		// Resizing large images - orginal by Christian Montoya edited by me.
		var pagesize = Thickbox.getPageSize();
		// Dimensiones máximas
		var x = pagesize[0] - Thickbox.minMarginWidth * 2 - Thickbox.imageMarginWidth * 2;
		var y = pagesize[1] - Thickbox.minMarginHeight * 2 - wndH + img.height();
		var imageWidth = Thickbox.imgPreloader.width;
		var imageHeight = Thickbox.imgPreloader.height;
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

		var firstNav = (!img.attr('src') || img.attr('src') == '');

		// Dimensiones de la ventana Thickbox para posicionar
		Thickbox.width = imageWidth + Thickbox.imageMarginWidth * 2; // 15px de espacio en cada lado
		// La altura de la ventana la conocemos. Solo hay que reemplazar la imagen antigua y poner la nueva, esto es, sus dimensiones. El height se tiene que hacer diferente porque intervienen más elementos que en el ancho
		Thickbox.height = wndH - img.height() + imageHeight;
		img.attr({
			src: Thickbox.imgPreloader.src,
			alt: $('#TB_caption').text()
		});

		var imgOpt = {width: imageWidth, height: imageHeight, opacity: 1};
		// Miramos si se carga al abrir o después de navegar. Si viene de abrirse, sin animación
		if (firstNav) {
			img.css(imgOpt);
		} else {
			img.animate(imgOpt, {duration: 'fast'});
		}

		Thickbox.position(navigation && !firstNav);
		Thickbox.displayClean();
	},
	updateNavigation: function() {
		var seq = Thickbox.galleryIndex;
		var len = Thickbox.galleryData.length;
		$('#TB_prev').css('display', (seq == 0 ? 'none' : ''));
		$('#TB_next').css('display', (seq >= len-1 ? 'none' : ''));
		$('#TB_imageCount').text('Imagen ' + (seq+1) + ' de ' + len);
	},
	navigate: function() {
		var seq = Thickbox.galleryIndex + (this.id == 'TB_prev' ? -1 : 1);
		var len = Thickbox.galleryData.length;
		if (seq < 0 || seq > len - 1) {
			return false;
		}
		Thickbox.galleryIndex = seq;
		var gitem = Thickbox.galleryData.eq(seq);
		var url = gitem.children('img').eq(0).attr('src');
		url = Thickbox.getUrlFromThumb(url);
		Thickbox.updateNavigation();
		if (Thickbox.imgPreloader.src != url) {
			$('#TB_window').stop();
			$('#TB_Image').queue('fx',[]).stop().animate({opacity: 0}, {duration: 'fast', complete: function() {
				Thickbox.imgPreloader.src = url;
			}});
		}
		$('#TB_caption').html(Thickbox.getCaption(gitem));
		$('#TB_descLink').attr('href',gitem.attr('href'));
		return false;
	},
	imgTipEvent: function(e) {
		if (e.ctrlKey || e.altKey || e.shiftKey) {
			return Thickbox.hideImgTip();
		}
		var target = e.target;
		if (Thickbox.isTag(target,'img')) { // Gallery o thumb
			var a = target.parentNode;
			if (!Thickbox.isTag(a,'a') || !Thickbox.isClass(a,'image')) {
				return Thickbox.hideImgTip();
			}
			var t = $(target);
			// Mostramos solo si la imagen tiene un tamaño mínimo
			if (t.width() < 40 || t.height() < 40) {
				return;
			}
			return Thickbox.showImgTip(t);
		}
		Thickbox.hideImgTip();
	},
	imgTipClickEvent: function() {
		if (Thickbox.imgTipTarget) {
			$(Thickbox.imgTipTarget).click();
			return false;
		}
	},
	createImgTip: function() {
		Thickbox.imgTip = $('<div id="TB_imagetip" title="Clic sobre la imagen para ampliar. Ctrl, Alt o Mayús. para acceder a la página de descripción de la imagen."></div>').appendTo('#positioned_elements');
		Thickbox.imgTip.bind('click',Thickbox.imgTipClickEvent);
	},
	showImgTip: function(target) {
		if (!Thickbox.imgTip) {
			Thickbox.createImgTip();
		}
		var of = target.offset();
		Thickbox.imgTip.css({
			display: 'block',
			left: of.left + target.width(),
			top: of.top + target.height()
		});
		Thickbox.imgTipVisible = true;
		Thickbox.imgTipTarget = target;
	},
	hideImgTip: function() {
		if (Thickbox.imgTipVisible) {
			Thickbox.imgTip.css('display','none');
			Thickbox.imgTipVisible = false;
			Thickbox.imgTipTarget = null;
		}
	}
};

if (wgAction != 'history' || !(wgNamespaceNumber == -1 && wgCanonicalSpecialPageName == 'Recentchanges')) {
	$(Thickbox.init);
}
/* </pre> */
