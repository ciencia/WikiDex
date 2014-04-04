/* v3.2 <pre>
 * ImageTitleValidator: Realiza validaciones sobre el nombre del archivo
 * Copyright (c) 2010 - 2012 Jesús Martínez (User:Ciencia_Al_Poder)
 * This program is free software; you can redistribute it and/or modify
 *   it under the terms of the GNU General Public License as published by
 *   the Free Software Foundation; either version 2 of the License, or
 *   (at your option) any later version
 *
 * @requires: mediawiki.api
 */
(function() {

var _re_sp = /[\s_]+/g,
	_re_scaled = /^\d+px-/,
	_re_ns = /^_*(Archivo|File|Image|Imagen)[\-:]+/i, // Espacio de nombres
	_re_ep = /^(EP|P|EE|EH|OP|OPJ|EDJ|PK|VI|PO|SME)[_.:\-]*(\d+)[_.:\-]*/i,
	_re_trim_start = /^_+/g,
	_re_trim_end = /[._\-]+$/g,
	_blacklists = [ // Busqueda en el nombre del archivo, sin extension. Los espacios están transformados en underscores --> _
		/[A-Za-z0-9]{16,}/, // carros de letras
		/^[A-Za-z0-9]{0,2}$/, // solo un o dos caracteres (el minimo es 3, para películas)
		/\d{11,}/,
		/[\\\/\|<>#"=\?]/, // Caracteres ilegales
		/^\d+$/, // Solo números
		/\.{2,}/, // Varios puntos seguidos
		/\-{2,}/, // Varios guiones
		/[A-Z]{5,}/, // Mayúsculas excesivas
		/-\d+-/, // Sufijos raros de venir de otras webs
		/image(n|s)?_?\(?\d+\)?/i,
		/^img/i,
		/thumb/i,
		/_by_/i, // AA by BB
		/trainer[_\-]?card/i, // Trainercards
		/^fb\.\d+/i,
		/Pok[ée]mon_.+_espa[ñn]ol_\d+/i, // Screenshots de emuladores
		/nuevopok[eéÉ]/i, // Nombres a evitar
		/new[_\-]?pok[eéÉ]/i,
		/wallpaper/i,
		/unnamed/i,
		/escanear/i,
		/CIMG/i,
		/^.{0,5}copia_de/i,
		/pxp/i,
		/\bpage\b/i,
		/\bevo\b/i,
		/^(January|February|March|April|May|June|July|August|September|October|November|December)/, // Web oficial XY
		/^(DP|AG|IL)_*\d+/i, // Episodios en formato DP
		/(jpg|jpeg|png|gif|bmp)$/i // Dobles extensiones
	],
	_whitelists = [ // Busqueda en el nombre del archivo, sin extension. Los espacios están transformados en underscores --> _
		/superentrenamiento/
	],
	_padZero = function(str, len) {
		while (str.length < len) {
			str = '0'+str;
		}
		return str;
	},
	// Retorna true en caso de haber completado la validación. False en caso de estar en proceso asíncrono
	_validate = function(callback) {
		this.completed = false;
		this.callback = (callback||null);
		this.validations = {thumb:-1, blacklist:-1};
		if (this.destFile == '') {
			this.validations = {};
			_endValidation.call(this);
			return true;
		}
		if (_validateThumb.call(this)) {
			_fixName.call(this);
			_validateBlackList.call(this);
			_endValidation.call(this);
			return true;
		}
		return false;
	},

	// Hace algunas correcciones básicas
	_fixName = function() {
		var n = this.suggestName.gen;
		// Esto debería haberlo hecho ya el sistema, pero por si aca
		n = n.replace(_re_sp,'_');
		var dot = n.lastIndexOf('.');
		if (dot == -1) return;
		// Extensión en minúscula y normalizando jpeg
		var ext = n.substr(dot+1).toLowerCase();
		if (ext == 'jpeg') {
			ext = 'jpg';
		}
		n = n.substr(0,dot);
		// Borrar espacios (y otros caracteres) antes y después del nombre (sin extensión) 
		n = n.replace(_re_trim_start, '').replace(_re_trim_end, ''); 
		// Mayúscula la primera
		n = n.substr(0,1).toUpperCase() + n.substr(1);
		// Sin namespace
		if (_re_ns.test(n)) {
			n = n.replace(_re_ns, '');
		}
		this.suggestName.gen = n+'.'+ext;
		_fixEPname.call(this, n, ext);
	},
	// Correcciones para imágenes de episodios: Código + número + espacio + letra en mayúscula
	_fixEPname = function(n, ext) {
		var reRes = _re_ep.exec(n);
		if (!reRes) return;
		var parts = reRes[1].toUpperCase();
		var len = 0;
		switch (parts) {
			case 'EP':
				len = 3;
				break;
			case 'P':
			case 'EE':
			case 'EH':
			case 'OP':
			case 'OPJ':
			case 'EDJ':
			case 'PK':
			case 'VI':
			case 'PO':
			case 'SME':
				len = 2;
				break;
			default:
				return;
				break;
		}
		parts += _padZero(reRes[2], len);
		var title = n.substr(reRes[0].length);
		if (title.length >= 1) {
			title = '_' + title.substr(0,1).toUpperCase() + title.substr(1);
		}
		this.suggestName.ep = parts + title + '.' + ext;
		return true;
	},
	// Valida que no sea un thumb. Si lo es mira si la imagen existe.
	_validateThumb = function() {
		var reArr = _re_scaled.exec(this.destFile), api, params;
		if (reArr) {
			this.suggestName.gen = this.destFile.substr(reArr[0].length);
			params = {
				action: 'query',
				titles: 'File:'+this.suggestName.gen,
				prop: 'imageinfo',
				iiprop: 'url'
			};
			api = new mw.Api();
			api.get(params, {
				ok: function(self) {
					return function(data) {
						_validateThumbExists.call(self, data);
					};
				}(this),
				err: function(self) {
					return function() {
						self.validations.thumb = 1;
						_endValidation.call(self);
					};
				}(this)
			} );
			return false;
		} else {
			this.validations.thumb = 0;
			return true;
		}
	},
	_validateThumbExists = function(data) {
		if (data.error) {
			this.validations.thumb = 1;
			_endValidation.call(this);
			return;
		}
		for (var pageid in data.query.pages) {
			if (!data.query.pages[pageid].imageinfo) {
				// No existe
				this.validations.thumb = 1;
			} else {
				// Existe
				this.validations.thumb = 2;
			}
		}
		_endValidation.call(this);
	},
	_validateBlackList = function() {
		var val = 0, wl = false, szName = this.destFile.replace(_re_sp, '_');
		szName = szName.substr(0, szName.lastIndexOf('.'));
		for (var i = 0; i < _whitelists.length; i++) {
			if (_whitelists[i].test(szName)) {
				wl = true;
				break;
			}
		}
		if (!wl) {
			for (var i = 0; i < _blacklists.length; i++) {
				if (_blacklists[i].test(szName)) {
					val = 1;
					break;
				}
			}
		}
		this.validations.blacklist = val;
	},
	_endValidation = function() {
		this.validated = true;
		for (var item in this.validations) {
			if (this.validations[item] !== 0) {
				this.validated = false;
			}
		}
		this.completed = true;
		if (typeof this.callback == 'function') {
			this.callback(this);
		}
	},
	_imageTitleValidator = function(destFile) {
		this.destFile = (destFile||'');
		this.completed = false;
		this.validated = false;
		this.validations = {};
		this.suggestName = {gen: this.destFile};
		this.callback = null;
	};

	_imageTitleValidator.prototype = {
		validate: function(callback) {
			_validate.call(this, callback);
		}
	};

	window.ImageTitleValidator = _imageTitleValidator;

})();

/* <pre>
 * UploadValidator v3.0: Realiza validaciones en el momento de subir archivos, proporcionando sugerencias de nombrado si
 *    es posible, categorización o licencia.
 * Copyright (c) 2010 - 2012 Jesús Martínez (User:Ciencia_Al_Poder)
 * This program is free software; you can redistribute it and/or modify
 *   it under the terms of the GNU General Public License as published by
 *   the Free Software Foundation; either version 2 of the License, or
 *   (at your option) any later version
 *
 * @requires: jquery.ui.dialog
 */
(function($) {

var _lock = false,
	_skip = false,
	_files = [],
	_inputDescCommon,
	_re_EP = /^(EP|EE|EH|P|OP|OPJ|EDJ|PK|VI)(\d+)/,
	_re_EPcat = /\[\[\s*[Cc]ategor(y|ía)\s*:\s*(EP|EE|EH|P|OP|OPJ|EDJ|PK|VI)\d+\s*(\|.*)?\]\]/,
	_re_EPlic = /\{\{\s*[Ss]creenshotTV\s*(\|.*)?\}\}/,
	_submitBtn = null,
	_dlg = null,
	_fieldHeight = 0,
	_init = function() {
		if (mw.config.get('wgCanonicalSpecialPageName', '') == 'Upload' && $('#wpDestFile').is('input') && !$('#wpDestFile').attr('readonly')) { // verificar que no se hace un re-upload
			_submitBtn = $('input[type=submit][name=wpUpload]', '#mw-upload-form');
			$('#mw-upload-form').bind('submit', _checkSubmit);
		} else if (mw.config.get('wgCanonicalSpecialPageName', '') == 'MultipleUpload') {
			_submitBtn = $('input[type=submit][name=wpUpload]', '#mw-upload-form');
			$('#mw-upload-form').bind('submit', _checkSubmit);
			_setupMultipleUploadForm();
		}
	},
	// Evento asociado al submit del formulario. Retornar false para no enviar los datos
	_checkSubmit = function() {
		if (_lock) return false;
		if (_skip) {
			_skip = false;
			return true;
		}
		_submitBtn.attr('disabled', 'disabled');
		_lock = true;
		_files = [];
		if (mw.config.get('wgCanonicalSpecialPageName', '') == 'MultipleUpload') {
			_inputDescCommon = $('#wpUploadDescription');
			for (var index = 0; document.getElementById('wpUploadFile'+index) !== null; index++) {
				var upFile = (($('#wpUploadFile'+index).val() || '').length != 0);
				var upFName = (($('#wpDestFile'+index).val() || '').length != 0);
				if (upFile && !upFName) {
					_showDlg('Debes escribir un nombre para el archivo <tt class="file"></tt>.', -1, {file: $('#wpUploadFile'+index).val()});
					return false;
				} else if (!upFile && upFName) {
					_showDlg('Debes seleccionar un archivo de tu PC para el archivo <tt class="name"></tt>.', -1, {name: $('#wpDestFile'+index).val()});
					return false;
				} else if (upFile && upFName) {
					_files.push({inputFile: $('#wpUploadFile'+index), inputName: $('#wpDestFile'+index), inputDesc: $('#wpUploadDescription'+index), validator: null, changes: {}});
				}
			}
			if (_files.length == 0) {
				_showDlg('No has seleccionado ningún archivo para subir.');
				return false;
			}
		} else {
			_files[0] = {inputFile: $('#wpUploadFile'), inputName: $('#wpDestFile'), inputDesc: $('#wpUploadDescription'), validator: null, changes: {}};
			_inputDescCommon = null;
		}

		// Validador
		for (var i = 0; i < _files.length; i++) {
			_files[i].validator = new ImageTitleValidator(_files[i].inputName.val());
			_files[i].validator.validate(_onValidate);
		}
		// Se previene el envío. Si las validaciones son correctas se fuerza el envío nuevamente
		return false;
	},
	// Función de validación para cada archivo
	_onValidate = function(v) {
		// No hacer nada hasta que no se hayan validado todos
		for (var i = 0; i < _files.length; i++) {
			if (!_files[i].validator || !_files[i].validator.completed) {
				return;
			}
		}
		// Se ha realizado la validación sobre todos los archivos: ahora hay que ir actualizando o mostrando mensajes al usuario
		// 1. Validar blacklists
		for (var i = 0; i < _files.length; i++) {
			var vs = _files[i].validator.validations;
			if (vs.blacklist == 1) {
				_showDlg('El nombre del archivo que intenta subir no está permitido. Algunas de las causas son: el nombre del archivo no es descriptivo o es incorrecto, contiene excesivas mayúsculas o es una trainer card. Lee de nuevo las instrucciones de subida de archivos de esta página para ver cómo resolver este problema.', i);
				return;
			}
			if (vs.thumb == 2) { // Thumb existente
				var szNormName = _files[i].validator.suggestName.gen;
				_showDlg('El archivo que intenta subir ya existe: <a href="'+mw.util.wikiGetlink(mw.config.get('wgFormattedNamespaces')[mw.config.get('wgNamespaceIds').file.toString()]+':'+szNormName)+'" target="_blank" class="normname"></a>.<br />En ningún caso debe subirse de nuevo un archivo que ya existe con otro copiado de otro sitio y en una resolución inferior.<br />Usa el archivo existente en vez de subirlo de nuevo. Lee la ayuda para saber cómo cambiar el tamaño de la imagen dentro de un artículo.', i, {normname:szNormName});
				return;
			} else if (vs.thumb == 1) { // Thumb no existente
				_showDlg('El archivo que intenta subir parece provenir de otro sitio. El nombre del archivo no es apropiado aquí. Por favor, lee las instrucciones para nombrar el archivo correctamente que encontrarás al inicio de este formulario.', i);
				return;
			}
		}
		var licencia = ($('#wpLicense').val() || '');
		// 2. Validaciones específicas por licencia
		// 2.1. Imágenes de episodio
		if (licencia == 'ScreenshotTV') {
			for (var i = 0; i < _files.length; i++) {
				if (!_files[i].validator.suggestName.ep) {
					_showDlg('Si la imagen es la captura de un episodio o película, debe nombrarse como se indica en las instrucciones de subida de archivos.', i);
					return;
				}
			}
		}

		// 3. Actualizar los nombres con las correcciones automáticas aplicadas
		for (var i = 0; i < _files.length; i++) {
			_files[i].inputName.val(_files[i].validator.suggestName.gen);
		}

		// 3.1. En este punto miramos si hay nombres duplicados ya. Luego se mira más adelante si además hay sugerencias de cambios de nombre
		if (!_validaNombresDuplicados()) {
			return;
		}

		// 4. Validaciones y cambios extra. Almacenamos los cambios propuestos, y luego pedimos confirmación al usuario
		// 4.1. Detectar todos los cambios propuestos
		var haycambios = false;
		for (var i = 0; i < _files.length; i++) {
			var f = _files[i];
			if (_procesarCambiosEP(f, licencia)) {
				haycambios = true;
			} else {
				// Si no se sugieren cambios para casos específicos, validar licencia-descripción: Uno de los dos debe estar informado
				if (licencia == '' && _files[i].inputDesc.val() == '' && (!_inputDescCommon || _inputDescCommon.val() == '')) {
					_showDlg('Debe seleccionar una licencia, o bien incluir la licencia o el origen y las categorías apropiadas en el espacio reservado para la descripción.', i);
					return;
				}
			}
		}

		// Si no ha saltado ninguna validación anterior, es que está todo correcto para nosotros. Enviamos el formulario.
		if (!haycambios) {
			_doSubmit();
		} else {
			// 4.2. Mostrar las validaciones al usuario
			_showChanges();
		}
	},
	// Determina si se han de realizar cambios en caso de que el nombre sugiera que se trata de una imagen de episodio
	_procesarCambiosEP = function(file, licencia) {
		var n = file.validator.suggestName.ep;
		if (!n) return false;
		var c = file.changes;
		var d = file.inputDesc.val();
		if (_inputDescCommon !== null && _inputDescCommon.val() !== '') {
			d = _inputDescCommon.val() + '\n' + d;
		}
		// Licencia
		if (licencia != 'ScreenshotTV') {
			if (!_re_EPlic.test(d)) {
				c.license = 'ScreenshotTV';
				c.has = true;
			}
		}
		// Nombre
		if (n != file.inputName.val()) {
			c.name = n;
			c.has = true;
		}
		var len = n.indexOf('_');
		if (len < 0) { // Caso de EP000.png
			len = n.indexOf('.');
		}
		// Categorías
		var arReEP = _re_EP.exec(n);
		var epcode = arReEP[0];
		var arRe = _re_EPcat.exec(d);
		if (!arRe) {
			// Agregar categoría
			c.cat = '[[Categoría:'+epcode+']]';
			c.has = true;
		} else if (arRe[0].indexOf(epcode) == -1) {
			// Reemplazar categoría
			c.cat = '[[Categoría:'+epcode+']]';
			c.replcat = arRe[0];
			c.has = true;
		}
		if (c.has) {
			c.status = 0;
			c.prompt = 'La imagen parece seguir las convenciones de nombrado de imágenes de episodios o películas. Si realmente se trata de este tipo de imagen, deberías aceptar los cambios propuestos:';
			return true;
		}
		return false;
	},
	// Presenta al usuario la lista de cambios sugeridos para que elija. Solo para el primer archivo que tenga cambios sin aceptar o rechazar. Se volverá a ejecutar esta función hasta que no quede ninguno
	// El status de cada change estará inicialmente a 0 y pasará a ser 1 o -1 según si el usuario acepta o rechaza el cambio
	_showChanges = function() {
		for (var i = 0; i < _files.length; i++) {
			var c = _files[i].changes;
			if (!c.has || c.status != 0) continue;
			var cont = c.prompt;
			var tx = {};
			cont += '<ul>';
			if (c.license) {
				cont += '<li>Cambiar la licencia a <tt class="license"></tt>.</li>';
			}
			if (c.name) {
				cont += '<li>Cambiar el nombre por <tt class="name"></tt>.</li>';
			}
			if (c.cat) {
				if (c.replcat) {
					cont += '<li>Reemplazar la categoría <tt class="replcat"></tt> por <tt class="cat"></tt>.</li>';
				} else {
					cont += '<li>Añadir la categoría <tt class="cat"></tt>.</li>';
				}
			}
			cont += '</ul>';
			var buttons = {
				'Subir con los cambios propuestos': function(it) {
					return function() {
						_files[i].changes.status = 1;
						_showChanges();
					};
				}(i),
				'Subir sin cambiar nada': function(it) {
					return function() {
						_files[i].changes.status = -1;
						_showChanges();
					};
				}(i),
				'Cancelar': function() {
					_closeDlg();
				}
			};
			_showDlg(cont, i, {license:c.license, name:c.name, replcat:c.replcat, cat:c.cat}, buttons);
			// Salimos del bucle. El dialogo devolverá la ejecución al siguiente elemento
			return;
		}

		if (!_validaNombresDuplicados()) {
			return;
		}

		// Aquí porque el diálogo se reemplaza en vez de cerrarse.
		_closeDlg();
		// Si no pasó por el return de arriba es que se ha tomado ya la decisión sobre todos. Realizar acciones
		_applyChanges();
	},
	// Valida que no haya nombres de archivo duplicados. Debe hacerse al final de todo
	_validaNombresDuplicados = function() {
		var nombres = {};
		for (var i = 0; i < _files.length; i++) {
			var f = _files[i];
			var c = f.changes;
			var n = f.inputName.val();
			if (c.has && c.status == 1 && c.name) {
				n = c.name;
			}
			if (nombres[n]) {
				_showDlg('Algunos de los archivos que intentas subir tienen el mismo nombre: <tt class="name"></tt>. Por favor, corrígelo', -1, {name: n});
				return false;
			} else {
				nombres[n] = true;
			}
		}
		return true;
	},
	// Había cambios propuestos y se han aceptado / rechazado. Aquí se aplican los cambios a los campos del formulario
	_applyChanges = function() {
		// Primero ver qué hacer con la licencia, pues afecta a todos
		var licencia = ($('#wpLicense').val() || ''),
			licenciaComun = null, f, c, lictmp;
		// Buscar si hay cambio de licencia y contradice la común
		for (var i = 0; i < _files.length; i++) {
			c = _files[i].changes;
			lictmp = licencia;
			if (c.has && c.status == 1 && c.license && c.license !== licencia) {
				lictmp = c.license;
			}
			if (licenciaComun == null) {
				licenciaComun = lictmp;
			} else if (licenciaComun != lictmp) {
				// se debe especificar licencia por archivo
				licenciaComun = null;
				break;
			}
		}
		// Si en todos se ha de agregar la misma categoría, la marcamos para que se agregue en la descripción común
		// Si hay que agregar categorías diferentes o solo en algunas, o hay que reemplazar, movemos el texto a la descripción individual
		var bAgregarCatComun = (_inputDescCommon !== null), catComun = null, bAlgunReemplazo = false;
		for (var i = 0; i < _files.length; i++) {
			c = _files[i].changes;
			if (c.has && c.status == 1) {
				if (c.replcat) {
					bAlgunReemplazo = true;
				}
				if (bAgregarCatComun && c.cat) {
					if (catComun !== null && catComun != c.cat) {
						bAgregarCatComun = false;
					}
					catComun = c.cat;
				} else {
					bAgregarCatComun = false;
				}
			} else {
				bAgregarCatComun = false;
			}
		}
		// Si hay que hacer reemplazos, ya no consideramos categoría común
		if (bAlgunReemplazo && bAgregarCatComun) {
			bAgregarCatComun = false;
		}
		// Mover descripción común a la individual si hay reemplazos
		if (bAlgunReemplazo && _inputDescCommon !== null && _inputDescCommon.val() !== '') {
			for (var i = 0; i < _files.length; i++) {
				_files[i].inputDesc.val(_inputDescCommon.val() + '\n' + _files[i].inputDesc.val())
			}
			_inputDescCommon.val('');
		}
		// Si hay categoría común, agregar
		if (bAgregarCatComun) {
			if (_inputDescCommon.val().length > 0) {
				_inputDescCommon.val(_inputDescCommon.val() + '\n' + catComun);
			} else {
				_inputDescCommon.val(catComun);
			}
		}
		if (licenciaComun !== null) {
			// Hay una licencia común, la informamos
			$('#wpLicense').val(licenciaComun);
		} else {
			// Seleccionar el no informado
			$('#wpLicense').children('option').get(0).selected = true;
		}
		for (var i = 0; i < _files.length; i++) {
			f = _files[i];
			c = f.changes;
			if (licencia != '' && licenciaComun === null && !(c.has && c.status == 1 && c.license)) {
				// Si este archivo no necesita cambios de licencia y no hay licencia común pero la licencia
				// está establecida, se debe especificar licencia por archivo cambiando la licencia a individual
				f.inputDesc.val($.trim(f.inputDesc.val()+'\n== Licencia ==\n{{'+licencia+'}}'));
			}
			if (c.has) {
				if (c.status == 1) {
					// El usuario acepta los cambios
					if (c.license && licenciaComun === null) {
						f.inputDesc.val($.trim(f.inputDesc.val()+'\n== Licencia ==\n{{'+c.license+'}}'));
					}
					if (c.name) {
						f.inputName.val(c.name);
					}
					if (c.replcat) {
						f.inputDesc.val(f.inputDesc.val().replace(c.replcat, c.cat));
					} else if (c.cat && !bAgregarCatComun) {
						f.inputDesc.val(f.inputDesc.val().length ? (f.inputDesc.val() + '\n' + c.cat) : c.cat);
					}
				} else {
					// El usuario rechaza los cambios
					if (c.license) {
						f.inputDesc.val('<!-- Se ha sugerido el cambio de licencia a '+c.license+' pero se ha omitido -->\n'+f.inputDesc.val());
					}
					if (c.name) {
						f.inputDesc.val('<!-- Se ha sugerido el cambio de nombre a '+c.name+' pero se ha omitido -->\n'+f.inputDesc.val());
					}
					if (c.replcat) {
						f.inputDesc.val('<!-- Se ha sugerido reemplazar la categoría '+c.replcat+' por '+c.cat+' pero se ha omitido -->\n'+f.inputDesc.val());
					} else if (c.cat) {
						f.inputDesc.val('<!-- Se ha sugerido añadir la categoría '+c.cat+' pero se ha omitido -->\n'+f.inputDesc.val());
					}
				}
			}
		}
		_doSubmit();
	},
	// Envía el formulario
	_doSubmit = function() {
		_unlock();
		_skip = true;
		if (mw.config.get('wgCanonicalSpecialPageName','') == 'MultipleUpload') {
			_preSubmitMultipleUploadForm();
		}
		// No se puede hacer la llamada directa, pues si no hay validación asíncrona aun estamos dentro del evento submit, y este al cancelar el evento evitará que podamos hacer otro submit seguido
		setTimeout(function(){ _submitBtn.click(); }, 100);
	},
	// Muestra la ventana con el mensaje al usuario.
	// @param cont [string]: contenido HTML
	// @param index [number]: índice del archivo (para que muestre el archivo al que va dirigida la validación)
	// @param texts [object]{name,value}: claves-valor para reemplazar elementos del parámetro @{cont}
	// @param buttons [object] botones presentes en el dialogo
	_showDlg = function(cont, index, texts, buttons) {
		var filename = '';
		texts = texts || {};
		if (typeof index == 'number' && index >= 0 && _files.length > 1) {
			texts['filename'] = _files[index].inputName.val();
			filename = '<tt>Archivo: <span class="filename"></span></tt><br />';
		}
		if (_dlg) {
			_dlg.html(filename+cont).dialog('open').dialog('option', {
				height: 'auto',
				position: 'center',
				buttons: buttons,
			});
		} else {
			_dlg = $('<div id="UploadValidatorDlg"></div>').html(filename+cont).dialog({
				modal: true,
				buttons: buttons,
				title: document.title,
				width: 500,
				close: function() {
					_unlock();
				}
			});
		}
		for (var elid in texts) {
			if (typeof texts[elid] == 'string') {
				_dlg.find('.'+elid).text(texts[elid]).removeClass(elid);
			}
		}
	},
	_closeDlg = function() {
		if (_dlg) {
			_dlg.dialog('close');
		}
	},
	_unlock = function() {
		if (_lock) {
			_lock = false;
			_submitBtn.removeAttr('disabled');
		}
	},
	// Modifica el formulario de Special:MultipleUpload para tener descripciones por separado
	_setupMultipleUploadForm = function() {
		var t = document.getElementById('mw-htmlform-source');
		if (!t) return;
		var oStoredDescs = _parseMultipleUploadFormHack();
		var rsl = t.tBodies[0].rows.length - 2; // Excluir 2 filas del final (upload-permitted y max-size)
		var lblDesc = $('#wpUploadDescription').parent().prev().children('label');
		_calculateFieldHeight();
		// Bucle hacia atrás, porque se van insertando rows. Cada archivo son 2 filas: file-input y nombre del archivo
		for (var fieldNum = ((rsl / 2) - 1), rowPos = (rsl - 1); rowPos >= 0; rowPos -= 2, fieldNum--) {
			var tr = t.tBodies[0].insertRow(rowPos+1);
			var desc = oStoredDescs[_normalizePageName( $('#wpDestFile'+fieldNum.toString()).val() || '' )];
			var txtDesc = $('<textarea id="wpUploadDescription'+fieldNum.toString()+'" style="width:98%; height:'+_fieldHeight+'px;"></textarea>');
			$(tr.insertCell(0)).addClass('mw-input').append(txtDesc);
			$(tr.insertCell(0)).addClass('mw-label').append(lblDesc.clone().attr('for', 'wpUploadDescription'+fieldNum.toString()));
			$(tr).addClass('mw-htmlform-field-HTMLTextField');
			if (desc && desc != '') {
				txtDesc.height(_fieldHeight * 3).val(desc);
			}
			txtDesc.bind('focus', _onMultiDescFocus).bind('blur', _onMultiDescBlur);
		}
		lblDesc.append('<br /><small>(común para todos los<br />archivos, adicional a cada<br />descripción independiente)</small>');
		if (oStoredDescs['*'] !== undefined) {
			$('#wpUploadDescription').val(oStoredDescs['*']);
		}
	},
	// Obtiene la altura por defecto de un campo de texto simple
	_calculateFieldHeight = function() {
		if (_fieldHeight === 0) {
			_fieldHeight = $('#wpDestFile0').height();
		}
	},
	// Evento cuando la descripción obtiene el foco
	_onMultiDescFocus = function(e) {
		$field = $(this), h = _fieldHeight * 3;
		if ($field.height() < h) {
			$field.queue('fx', []).stop().animate({height: h}, 750, 'swing',
				function() { $(this).css('overflow', 'auto') });
		}
	},
	// Evento cuando la descripción pierde el foco
	_onMultiDescBlur = function(e) {
		$field = $(this);
		if ($field.height() > _fieldHeight && $.trim($field.val()).length == 0) {
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
					if (prevname != '') {
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
		if (prevname != '') {
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
		txtdesc += '|}}'
		if (haydesc) {
			if (comun.length) {
				comun += '\n' + txtdesc;
			} else {
				comun = txtdesc;
			}
		}
		$('#wpUploadDescription').val(comun);
	},
	// Convierte la primera letra en mayúscula y los guiones bajos en espacios
	_normalizePageName = function(page) {
		var ret = '';
		if (page.length) {
			ret += page.substr(0, 1).toUpperCase();
		}
		if (page.length > 1) {
			ret += page.substr(1);
		}
		ret = ret.replace(/_/g, ' ');
		return ret;
	};

	(typeof(window.safeOnLoadHook)=='function'?safeOnLoadHook:$)(_init);

})(jQuery);
/* </pre> */
