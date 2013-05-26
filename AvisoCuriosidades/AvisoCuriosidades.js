/* v2.2 <pre>
 * AvisoCuriosidades: Muestra un aviso al añadir curiosidades
 * Copyright (c) 2011 - 2012 Jesús Martínez (User:Ciencia_Al_Poder)
 * This program is free software; you can redistribute it and/or modify
 *   it under the terms of the GNU General Public License as published by
 *   the Free Software Foundation; either version 2 of the License, or
 *   (at your option) any later version
 * @requires: jquery.ui.dialog, mediawiki.api
 */
(function($) {
	var _re_hcuriosidades = null,
		_re_emptyline = null,
		_initialItems = -1,
		_tagSession = 'Curiosidades',
		_pID,
		_doneUnset = false,
		_init = function() {
			_re_hcuriosidades = new RegExp('==\\s*[Cc]uriosidades\\s*==');
			_re_emptyline = new RegExp('^\\s*$');
			_pID = mw.config.get('wgArticleId', 0).toString();
			// Obtenemos número inicial desde storage
			_getPSData();
			// Si no hay nada, obtenemos de página
			if (_initialItems == -1) {
				_initialItems = _countItems();
			}
			_setEvents();
		},
		_countItems = function() {
			// Buscar el encabezado de curiosidades
			var text = $('#wpTextbox1').val(), nItems = 0, cStart = text.search(_re_hcuriosidades),
				cBody, cEnd, aLines;
			if (cStart >= 0) {
				cBody = text.substr(cStart);
				aLines = cBody.split('\n');
				// Saltamos el encabezado
				for (var i = 1; i < aLines.length; i++) {
					// Salimos en el siguiente encabezado
					if (aLines[i].length > 2 && aLines[i].substr(0, 2) == '==') {
						break;
					}
					// Saltamos líneas en blanco
					if (!_re_emptyline.test(aLines[i])) {
						nItems++;
					}
				}
			}
			return nItems;
		},
		_setPSData = function() {
			if (_initialItems > 0 && !_doneUnset) {
				try {
					sessionStorage.setItem(_tagSession, _pID + '|' + _initialItems.toString());
				} catch (e) { }
			}
		},
		_getPSData = function() {
			var val, parts, items;
			try {
				val = sessionStorage.getItem(_tagSession);
			} catch (e) { }
			if (val) {
				parts = val.split('|');
				if (parts.length == 2 && parts[0].toString() == _pID) {
					items = parseInt(parts[1], 10);
					if (!isNaN(items) && items > -1) {
						_initialItems = items;
					}
				}
			}
		},
		_unsetPSData = function() {
			try {
				sessionStorage.removeItem(_tagSession);
			} catch (e) { }
			_doneUnset = true;
		},
		_setEvents = function() {
			$('form#editform').bind('submit.AvisoCuriosidades', _setPSData);
			$('#wpSave').bind('click.AvisoCuriosidades', _checkSubmit);
		},
		_unsetEvents = function() {
			$('form#editform').unbind('submit.AvisoCuriosidades');
			$('#wpSave').unbind('click.AvisoCuriosidades');
		},
		_checkSubmit = function(e) {
			var params, nItems = _countItems(), api;
			if (_initialItems != -1 && nItems > _initialItems) {
				// Establecer actuales
				_initialItems = nItems;
				_setPSData();
				// Prevenir edición
				$('#wpSave').attr('disabled', 'disabled');
				params = {
					action: 'parse',
					page: 'MediaWiki:Aviso curiosidades irrelevantes',
					prop: 'text',
					disablepp: ''
				};
				api = new mw.Api();
				api.get(params, { ok: _displayDialog, err: _end } );
				return false;
			}
		},
		_displayDialog = function(data) {
			if (data.error) {
				_end();
				return;
			}
			$('<div></div>').html(data.parse.text['*']).dialog({
				modal: true,
				title: 'Atención',
				width: $(document).width()*0.75,
				close: _end
			});
		},
		_end = function() {
			$('#wpSave').removeAttr('disabled');
			_unsetEvents();
			_unsetPSData();
		};

	$(_init);
})(jQuery);
/*</pre>*/