/* v1.0 <pre>
 * AvisoCuriosidades: Muestra un aviso al añadir curiosidades
 * Copyright (c) 2011 Jesús Martínez (User:Ciencia_Al_Poder)
 * This program is free software; you can redistribute it and/or modify
 *   it under the terms of the GNU General Public License as published by
 *   the Free Software Foundation; either version 2 of the License, or
 *   (at your option) any later version
*/
var AvisoCuriosidades = {
	re_hcuriosidades: null,
	re_emptyline: null,
	initialItems: -1,
	tagCookie: null,
	init: function() {
		AvisoCuriosidades.re_hcuriosidades = new RegExp('={2}\\s*[Cc]uriosidades\\s*={2}');
		AvisoCuriosidades.re_emptyline = new RegExp('^\\s*$');
		AvisoCuriosidades.tagCookie = 'Curiosidades_'+(window.wgArticleId||'0').toString();
		if (document.location.toString().indexOf('action=edit') > 0) {
			// Obtenemos número inicial desde texto
			AvisoCuriosidades.initialItems = AvisoCuriosidades.countItems();
		} else {
			// Obtenemos número inicial desde cookie, pues est? previsualizando
			AvisoCuriosidades.getPSData();
		}
		AvisoCuriosidades.setEvents();
	},
	countItems: function() {
		// Buscar el encabezado de curiosidades
		var text = $('#wpTextbox1').val(), nItems = 0, cStart = text.search(AvisoCuriosidades.re_hcuriosidades);
		if (cStart >= 0) {
			var cBody = text.substr(cStart);
			for (var i = 0; i < 3; i++) {
				// Buscamos los == de encabezado
				var cEnd = cBody.indexOf('==');
				if (cEnd > 0) {
					if (i != 2) {
						// Los dos primeros son del encabezado de curiosidades
						cBody = cBody.substr(cEnd+2);
					} else {
						// Si encuentra el tercero, es el fin de la secci?n de curiosidades. Descartamos lo que venga detr?s
						cBody = cBody.substr(0, cEnd);
					}
				}
			}
			var aLines = $.grep(cBody.split('\n'), function(n, i) {
				return !AvisoCuriosidades.re_emptyline.test(n);
			});
			nItems = aLines.length;
		}
		return nItems;
	},
	setPSData: function() {
		if (AvisoCuriosidades.initialItems > -1) {
			$.cookies.set(AvisoCuriosidades.tagCookie, AvisoCuriosidades.initialItems.toString(), {hoursToLive: 0.02}); // 1.2 minutes
		}
	},
	getPSData: function() {
		var val = $.cookies.get(AvisoCuriosidades.tagCookie);
		if (val) {
			val = parseInt(val, 10);
			if (!isNaN(val) && val > -1) {
				AvisoCuriosidades.initialItems = val;
			}
		}
	},
	delPSData: function() {
		$.cookies.set(AvisoCuriosidades.tagCookie, null);
	},
	setEvents: function() {
		$('form#editform').bind('submit.AvisoCuriosidades', AvisoCuriosidades.setPSData);
		$('#wpSave').bind('click.AvisoCuriosidades', AvisoCuriosidades.checkSubmit);
	},
	unsetEvents: function() {
		$('form#editform').unbind('submit.AvisoCuriosidades');
		$('#wpSave').unbind('click.AvisoCuriosidades');
	},
	checkSubmit: function(e) {
		if (AvisoCuriosidades.initialItems > -1 && AvisoCuriosidades.countItems() > AvisoCuriosidades.initialItems) {
			$('#wpSave').attr('disabled', 'disabled');
			Thickbox.showPage('MediaWiki:Aviso curiosidades irrelevantes');
			$('#TB_window').bind('unload', function() {
				$('#wpSave').removeAttr('disabled');
				AvisoCuriosidades.unsetEvents();
			})
			return false;
		}
	}
}

$(AvisoCuriosidades.init);
