// <pre>
/*
 * DisableFirstSubmit v2.4: Clase para deshabilitar el botón de guardar la primera vez que se edita un artículo.
 * No lo deshabilita físicamente, pero en lugar de guardar avisará al usuario con un mensaje que obtiene de una página del wiki.
 * Copyright (C) 2009 - 2012 Jesús Martínez Novo ([[User:Ciencia Al Poder]])
 * This program is free software; you can redistribute it and/or modify
 *   it under the terms of the GNU General Public License as published by
 *   the Free Software Foundation; either version 2 of the License, or
 *   (at your option) any later version
 * @requires: jquery.ui.dialog, mediawiki.api
 */
(function($) {
	var _dlg = null,
		_init = function() {
			$('#wpSave').on('click', _onSave);
			$('#wpPreview').add('#wpDiff').on('click.disablefirstsubmit', _onPreview);
		},
		_onSave = function() {
			var api, params;
			if (_dlg == null) {
				api = new mw.Api();
				params = {
					action: 'parse',
					page: 'MediaWiki:Common.js/Clases/DisableFirstSubmit.js/Userpage',
					prop: 'text',
					lang: mw.config.get('wgUserLanguage', mw.config.get('wgContentLanguage')),
					disablepp: ''
				};
				api.get(params).done(_displayDialog).fail(_endError);
			} else {
				_dlg.dialog('open');
			}
			$('#wpSave').attr('disabled', 'disabled');
			return false;
		},
		_onPreview = function() {
			$('#wpSave').off('click', _onSave);
			$('#wpPreview').add('#wpDiff').off('click.disablefirstsubmit');
			_end();
		},
		_displayDialog = function(data) {
			if (data.error) {
				_end();
				return;
			}
			_dlg = $('<div></div>').html(data.parse.text['*']).dialog({
				modal: true,
				title: 'Atención',
				width: $(document).width()*0.75,
				close: _end
			});
		},
		_endError = function() {
			$('#wpSave').off('click', _onSave);
			_end();
		},
		_end = function() {
			$('#wpSave').removeAttr('disabled');
		};

	$(_init);
})(jQuery);
// </pre>