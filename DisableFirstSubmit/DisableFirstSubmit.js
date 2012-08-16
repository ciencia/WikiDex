// <pre>
/*
 * DisableFirstSubmit v2.0: Clase para deshabilitar el botón de guardar la primera vez que se edita un artículo.
 * No lo deshabilita físicamente, pero en lugar de guardar avisará al usuario con un mensaje que obtiene de una página del wiki.
 * Copyright (C) 2009 - 2012 Jesús Martínez Novo ([[User:Ciencia Al Poder]])
 * This program is free software; you can redistribute it and/or modify
 *   it under the terms of the GNU General Public License as published by
 *   the Free Software Foundation; either version 2 of the License, or
 *   (at your option) any later version
 * @requires: jquery.ui.dialog, mediawiki.api
 */
(function($) {
	var _init = function() {
			$('#wpSave').bind('click', _onSave);
		},
		_onSave = function() {
			$('#wpSave').attr('disabled', 'disabled');
			params = {
				action: 'parse',
				page: 'MediaWiki:Common.js/Clases/DisableFirstSubmit.js/Userpage',
				prop: 'text',
				lang: mw.config.get('wgUserLanguage', mw.config.get('wgContentLanguage')),
				disablepp: ''
			};
			api = new mw.Api();
			api.get(params, { ok: _displayDialog, err: _end } );
			return false;
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
			$('#wpSave').unbind('click', _onSave);
			$('#wpSave').removeAttr('disabled');
		};

	$(_init);
})(jQuery);
// </pre>
