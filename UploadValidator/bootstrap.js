/* <pre>
 * Bootstrap for UploadValidator: Integra UploadValidator en los formularios
 * de subida de archivos, y modifica MultipleUpload para agregar descripciones
 * individualizadas en cada archivo.
 * 
 * Copyright (c) 2010 - 2014 Jesús Martínez (User:Ciencia_Al_Poder)
 * This program is free software; you can redistribute it and/or modify
 *   it under the terms of the GNU General Public License as published by
 *   the Free Software Foundation; either version 2 of the License, or
 *   (at your option) any later version
 */
(function($, mw) {
	'use strict';
	var _bypassSubmit = false,
	_fieldHeight = 0,
	_log = function(text) {
		if (window.console && window.console.log) {
			window.console.log('UploadValidator.bootstrap: ' + text);
		}
	},
	_init = function() {
		if (mw.config.get('wgCanonicalSpecialPageName') == 'Upload') {
			_setupSpecialUpload();
		} else if (mw.config.get('wgCanonicalSpecialPageName') == 'MultipleUpload') {
			_setupSpecialMultiUpload();
		}
	},
	_loadScripts = function() {
		$.getScript(mw.config.get('wgScript') + '?title=MediaWiki:Common.js/Clases/UploadValidator.js&action=raw&ctype=text/javascript', function() {
			$.getScript(mw.config.get('wgScript') + '?title=MediaWiki:Common.js/Clases/UploadValidator.validators.js&action=raw&ctype=text/javascript', _registerValidators);
		});
	},
	_setupSpecialUpload = function() {
		// Evitar que se active al volver a subir un archivo
		if ($('#wpDestFile').is('input') && !$('#wpDestFile').prop('readonly')) {
			_loadScripts();
			$('#mw-upload-form').bind('submit', _submitUpload);
		}
	},
	_setupSpecialMultiUpload = function() {
		_loadScripts();
		_setupMultipleUploadForm();
		$('#mw-upload-form').bind('submit', _submitMultiUpload);
	},
	// Modifica el formulario de Special:MultipleUpload para tener descripciones por separado
	_setupMultipleUploadForm = function() {
		var t = document.getElementById('mw-htmlform-source'), oStoredDescs, rslen, $lblDesc, tr, desc, $txtDesc;
		if (!t) return;
		// Obtenemos las descripciones existentes en caso de recuperar el formulario
		oStoredDescs = _parseMultipleUploadFormHack();
		rslen = t.tBodies[0].rows.length - 2; // Excluir 2 filas del final (upload-permitted y max-size)
		$lblDesc = $('#wpUploadDescription').parent().prev().children('label');
		_calculateFieldHeight();
		// Bucle hacia atrás, porque se van insertando rows. Cada archivo son 2 filas: file-input y nombre del archivo
		for (var fieldNum = ((rslen / 2) - 1), rowPos = (rslen - 1); rowPos >= 0; rowPos -= 2, fieldNum--) {
			tr = t.tBodies[0].insertRow(rowPos+1);
			desc = oStoredDescs[_normalizePageName( $('#wpDestFile'+fieldNum.toString()).val() || '' )];
			$txtDesc = $('<textarea id="wpUploadDescription'+fieldNum.toString()+'" style="width:98%; height:'+_fieldHeight+'px;"></textarea>');
			$(tr.insertCell(0)).addClass('mw-input').append($txtDesc);
			$(tr.insertCell(0)).addClass('mw-label').append($lblDesc.clone().attr('for', 'wpUploadDescription'+fieldNum.toString()));
			$(tr).addClass('mw-htmlform-field-HTMLTextField');
			if (desc && desc !== '') {
				$txtDesc.height(_fieldHeight * 3).val(desc);
			}
			$txtDesc.on({focus: _onMultiDescFocus, blur: _onMultiDescBlur});
		}
		$lblDesc.append('<br /><small>(común para todos los<br />archivos, adicional a cada<br />descripción independiente)</small>');
		if (oStoredDescs['*']) {
			$('#wpUploadDescription').val(oStoredDescs['*']);
		}
	},
	// Obtiene la altura por defecto de un campo de texto simple
	_calculateFieldHeight = function() {
		if (_fieldHeight === 0) {
			_fieldHeight = parseInt($('#wpDestFile0').height(), 10);
		}
	},
	// Evento cuando la descripción obtiene el foco
	_onMultiDescFocus = function() {
		var $field = $(this), h = _fieldHeight * 3;
		if ($field.height() < h) {
			$field.queue('fx', []).stop().animate({height: h}, 750, 'swing',
				function() { $(this).css('overflow', 'auto'); });
		}
	},
	// Evento cuando la descripción pierde el foco
	_onMultiDescBlur = function() {
		var $field = $(this);
		if ($field.height() > _fieldHeight && $.trim($field.val()).length === 0) {
			$field.css('overflow', 'hidden').queue('fx', []).stop().animate({height: _fieldHeight}, 750, 'swing');
		}
	},
	// Obtiene el texto de la descripción común de Special:MultipleUpload y busca el #switch: que aporta la descripción individualizada
	_parseMultipleUploadFormHack = function() {
		var oRet = {},
			tmpl = $('#wpUploadDescription').val(),
			idx = -1,
			tag = '',
			prevname = '',
			previdx = tmpl.indexOf('{{subst:#switch:{{subst:PAGENAME}}|'),
			comun = null;
		if (previdx == -1) return oRet;
		comun = tmpl.substr(0, previdx);
		for (var i = 0; document.getElementById('wpDestFile'+i.toString()) !== null; i++) {
			var n = _normalizePageName($('#wpDestFile'+i.toString()).val());
			if (n.length) {
				tag = '|' + n + ' = ';
				idx = tmpl.indexOf(tag, previdx);
				if (idx != -1) {
					if (prevname !== '') {
						oRet[prevname] = tmpl.substring(previdx, idx);
					}
					prevname = n;
					previdx = idx + tag.length;
				} else {
					// No se puede determinar de forma fiable :(
					return oRet;
				}
			}
		}
		if (prevname !== '') {
			tag = '|}}';
			idx = tmpl.indexOf(tag, previdx);
			if (idx != -1) {
				oRet[prevname] = tmpl.substring(previdx, idx);
			}
		}
		// Guardamos el texto común
		oRet['*'] = comun;
		return oRet;
	},
	// Convierte la primera letra en mayúscula y los guiones bajos en espacios
	_normalizePageName = function(page) {
		var ret = '';
		if (page.length > 0) {
			ret += page.substr(0, 1).toUpperCase() + page.substr(1);
			ret = ret.replace(/_/g, ' ');
		}
		return ret;
	},
	_registerValidators = function() {
		var ov = mw.config.get('wgValidators');
		if (!ov || !window.UploadValidator) {
			_log('Sin validadores!!');
			return;
		}
		for (var i = 0; i < ov.length; i++) {
			window.UploadValidator.registerValidators(ov[i]);
		}
	},
	_submitUpload = function(e) {
		_log('_submitUpload ('+_bypassSubmit+')');
		if (_bypassSubmit) {
			_bypassSubmit = false;
			return;
		}
		if (window.UploadValidator) {
			e.preventDefault();
			$('input[type=submit]', '#mw-upload-form').attr('disabled', 'disabled');
			// Agregamos un pequeño timeout para que salten otros eventos que modifiquen el texto.
			window.setTimeout(_validateUpload, 100);
		}
	},
	_validateUpload = function() {
		var params = {
			sources: [
				{
					inputFile: $('#wpUploadFile'),
					inputName: $('#wpDestFile'),
					inputDesc: $('#wpUploadDescription')
				}
			],
			license: $('#wpLicense'),
			callback: _endUploadValidator
		};
		window.UploadValidator.validate(params);
	},
	_endUploadValidator = function(success) {
		$('input[type=submit]', '#mw-upload-form').removeAttr('disabled');
		if (success) {
			_log('_endUploadValidator: success');
			// Es necesario poner un timeout si venimos de un evento jQuery, porque no permite volver a lanzar otro
			window.setTimeout(_submitBypassUpload, 100);
		}
	},
	_submitMultiUpload = function(e) {
		_log('_submitUpload ('+_bypassSubmit+')');
		if (_bypassSubmit) {
			_bypassSubmit = false;
			return;
		}
		if (window.UploadValidator) {
			e.preventDefault();
			$('input[type=submit]', '#mw-upload-form').attr('disabled', 'disabled');
			// Agregamos un pequeño timeout para que salten otros eventos que modifiquen el texto.
			window.setTimeout(_validateMultiUpload, 100);
		} else {
			_preSubmitMultipleUploadForm();
		}
	},
	_validateMultiUpload = function() {
		var params = {
			sources: [],
			commonDesc: $('#wpUploadDescription'),
			license: $('#wpLicense'),
			callback: _endMultiUploadValidator
		}, source;
		for (var index = 0; document.getElementById('wpUploadFile'+index.toString()) !== null; index++) {
			source = {};
			source.inputFile = $('#wpUploadFile'+index.toString());
			source.inputName = $('#wpDestFile'+index.toString());
			// Debe haber por lo menos 1
			if (index === 0 || source.inputFile.val() || source.inputName.val()) {
				source.inputDesc = $('#wpUploadDescription'+index.toString());
				params.sources.push(source);
			}
		}
		window.UploadValidator.validate(params);
	},
	_endMultiUploadValidator = function(success) {
		$('input[type=submit]', '#mw-upload-form').removeAttr('disabled');
		if (success) {
			_log('_endMultiUploadValidator: success');
			_preSubmitMultipleUploadForm();
			// Es necesario poner un timeout si venimos de un evento jQuery, porque no permite volver a lanzar otro
			window.setTimeout(_submitBypassUpload, 100);
		}
	},
	// Incluye cada descripción individual en la descripción común, dentro de un #switch:
	_preSubmitMultipleUploadForm = function() {
		var txtdesc = '{{subst:#switch:{{subst:PAGENAME}}',
			comun = $.trim($('#wpUploadDescription').val()),
			haydesc = false;
		for (var i = 0; document.getElementById('wpDestFile'+i.toString()) !== null; i++) {
			var desc = $.trim( $('#wpUploadDescription'+i.toString()).val() );
			var filename = $('#wpDestFile'+i.toString()).val();
			if (desc.length && filename && filename.length) {
				haydesc = true;
				txtdesc += '|' + _normalizePageName(filename) + ' = ' + desc;
			}
		}
		txtdesc += '|}}';
		if (haydesc) {
			if (comun.length) {
				comun += '\n' + txtdesc;
			} else {
				comun = txtdesc;
			}
		}
		$('#wpUploadDescription').val(comun);
	},
	_submitBypassUpload = function() {
		_bypassSubmit = true;
		$('input[type=submit][name=wpUpload]', '#mw-upload-form').click();
	};

	$(_init);
})(jQuery, mw);

// </pre>