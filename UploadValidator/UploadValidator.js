/* v2.7 <pre>
 * ImageTitleValidator: Realiza validaciones sobre el nombre del archivo
 * Copyright (c) 2010 Jesús Martínez (User:Ciencia_Al_Poder)
 * This program is free software; you can redistribute it and/or modify
 *   it under the terms of the GNU General Public License as published by
 *   the Free Software Foundation; either version 2 of the License, or
 *   (at your option) any later version
*/
function ImageTitleValidator(destFile) {
	this.destFile = (destFile||'');
	this.completed = false;
	this.validated = false;
	this.validations = {};
	this.suggestName = {gen: this.destFile};
	this.callback = null;
}

ImageTitleValidator.prototype = {
	re_sp: /[\s_]+/g,
	re_scaled: /^\d+px-/,
	re_ns: /^_*(Archivo|File|Image|Imagen)[\-:]+/i, // Espacio de nombres
	re_ep: /^(EP|P|EE|EH|OP|OPJ|EDJ|PK|VI)[_.:\-]*(\d+)[_.:\-]*/i,
	re_trim_start: /^_+/g,
	re_trim_end: /[._\-]+$/g,
	blacklists: [// Busqueda en el nombre del archivo, sin extension. Los espacios están transformados en underscores --> _
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
		/^(DP|AG|IL)_*\d+/i, // Episodios en formato DP
		/(jpg|jpeg|png|gif|bmp)$/i // Dobles extensiones
	],
	// Retorna true en caso de haber completado la validación. False en caso de estar en proceso asíncrono
	validate: function(callback) {
		this.completed = false;
		this.callback = (callback||null);
		this.validations = {thumb:-1, blacklist:-1};
		if (this.destFile == '') {
			this.validations = {};
			this.endValidation();
			return true;
		}
		if (this.validateThumb()) {
			this.fixName();
			this.validateBlackList();
			this.endValidation();
			return true;
		}
		return false;
	},
	// Hace algunas correcciones básicas
	fixName: function() {
		var n = this.suggestName.gen;
		// Esto debería haberlo hecho ya el sistema, pero por si aca
		n = n.replace(this.re_sp,'_');
		var dot = n.lastIndexOf('.');
		if (dot == -1) return;
		// Extensión en minúscula y normalizando jpeg
		var ext = n.substr(dot+1).toLowerCase();
		if (ext == 'jpeg') {
			ext = 'jpg';
		}
		n = n.substr(0,dot);
		// Borrar espacios (y otros caracteres) antes y después del nombre (sin extensión)
		n = n.replace(this.re_trim_start, '').replace(this.re_trim_end, '');
		// Mayúscula la primera
		n = n.substr(0,1).toUpperCase() + n.substr(1);
		// Sin namespace
		if (this.re_ns.test(n)) {
			n = n.replace(this.re_ns, '');
		}
		this.suggestName.gen = n+'.'+ext;
		this.fixEPname(n,ext);
	},
	// Correcciones para imágenes de episodios: Código + número + espacio + letra en mayúscula
	fixEPname: function(n,ext) {
		var reRes = this.re_ep.exec(n);
		if (!reRes) return;
		var parts = '';
		parts = reRes[1].toUpperCase();
		var len = 0;
		if (parts == 'EP') len = 3;
		else if (parts == 'P' || parts == 'EE' || parts == 'EH' || parts == 'OP' || parts == 'OPJ' || parts == 'EDJ' || parts == 'PK' || parts == 'VI') len = 2;
		else return;
		parts += this.padZero(reRes[2], len);
		var title = n.substr(reRes[0].length);
		if (title.length >= 1) {
			title = '_' + title.substr(0,1).toUpperCase() + title.substr(1);
		}
		this.suggestName.ep = parts + title + '.' + ext;
		return true;
	},
	padZero: function(str, len) {
		while (str.length < len) {
			str = '0'+str;
		}
		return str;
	},
	// Valida que no sea un thumb. Si lo es mira si la imagen existe.
	validateThumb: function() {
		var reArr = this.re_scaled.exec(this.destFile);
		if (reArr) {
			this.suggestName.gen = this.destFile.substr(reArr[0].length);
			$.getJSON(wgScriptPath+'/api.php?action=query&titles=File:'+this.suggestName.gen+'&prop=imageinfo&iiprop=url&format=json', function(thisArg) {
				return function(data) {
					thisArg.validateThumbExists(data);
				};
			}(this));
			return false;
		} else {
			this.validations.thumb = 0;
			return true;
		}
	},
	validateThumbExists: function(data) {
		for (var pageid in data.query.pages) {
			if (!data.query.pages[pageid].imageinfo) {
				// No existe
				this.validations.thumb = 1;
			} else {
				// Existe
				this.validations.thumb = 2;
			}
		}
		this.endValidation();
	},
	validateBlackList: function() {
		var val = 0;
		var szName = this.destFile.replace(this.re_sp, '_');
		szName = szName.substr(0,szName.lastIndexOf('.'));
		for (var i = 0; i < this.blacklists.length; i++) {
			if (this.blacklists[i].test(szName)) {
				val = 1;
				break;
			}
		}
		this.validations.blacklist = val;
	},
	endValidation: function() {
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
	}
};

/* <pre>
 * UploadValidator v2.1: Realiza validaciones en el momento de subir archivos, proporcionando sugerencias de nombrado si
 *    es posible, categorización o licencia.
 * Copyright (c) 2010 - 2011 Jesús Martínez (User:Ciencia_Al_Poder)
 * This program is free software; you can redistribute it and/or modify
 *   it under the terms of the GNU General Public License as published by
 *   the Free Software Foundation; either version 2 of the License, or
 *   (at your option) any later version
*/
UploadValidator = {
	lock: false,
	skip: false,
	files: [],
	re_EP: /^(EP|EE|EH|P|OP|OPJ|EDJ|PK|VI)(\d+)/,
	re_EPcat: /\[\[\s*[Cc]ategor(y|ía)\s*:\s*(EP|EE|EH|P|OP|OPJ|EDJ|PK|VI)\d+\s*(\|.*)?\]\]/,
	re_EPlic: /\{\{\s*[Ss]creenshotTV\s*(\|.*)?\}\}/,
	submitBtn: null,
	init: function() {
		if (window.wgCanonicalSpecialPageName == 'Upload' && $('#wpDestFile').is('input') && !$('#wpDestFile').attr('readonly')) { // verificar que no se hace un re-upload
			UploadValidator.submitBtn = $('input[type=submit][name=wpUpload]', '#mw-upload-form');
			$('#mw-upload-form').bind('submit', UploadValidator.checkSubmit);
		} else if (window.wgCanonicalSpecialPageName == 'MultipleUpload') {
			UploadValidator.submitBtn = $('input[type=submit][name=wpUpload]', '#mw-upload-form');
			$('#mw-upload-form').bind('submit', UploadValidator.checkSubmit);
			UploadValidator.setupMultipleUploadForm();
		}
	},
	// Evento asociado al submit del formulario. Retornar false para no enviar los datos
	checkSubmit: function() {
		// Necesitamos Thickbox para mostrar los mensajes
		if (!window.Thickbox) {
			return true;
		}
		if (UploadValidator.lock) return false;
		if (UploadValidator.skip) {
			UploadValidator.skip = false;
			return true;
		}
		UploadValidator.submitBtn.attr('disabled','disabled');
		UploadValidator.lock = true;
		UploadValidator.files = [];
		if (window.wgCanonicalSpecialPageName == 'MultipleUpload') {
			for (var index = 0; $('#wpUploadFile'+index).exists(); index++) {
				var upFile = (($('#wpUploadFile'+index).val() || '').length != 0);
				var upFName = (($('#wpDestFile'+index).val() || '').length != 0);
				if (upFile && !upFName) {
					UploadValidator.showDlg('Debes escribir un nombre para el archivo <tt class="file"></tt>.', -1, {file: $('#wpUploadFile'+index).val()});
					return false;
				} else if (!upFile && upFName) {
					UploadValidator.showDlg('Debes seleccionar un archivo de tu PC para el archivo <tt class="name"></tt>.', -1, {name: $('#wpDestFile'+index).val()});
					return false;
				} else if (upFile && upFName) {
					UploadValidator.files.push({inputFile: $('#wpUploadFile'+index), inputName: $('#wpDestFile'+index), inputDesc: $('#wpUploadDescription'+index), validator: null, changes: {}});
				}
			}
			if (UploadValidator.files.length == 0) {
				UploadValidator.showDlg('No has seleccionado ningún archivo para subir.');
				return false;
			}
		} else {
			UploadValidator.files[0] = {inputFile: $('#wpUploadFile'), inputName: $('#wpDestFile'), inputDesc: $('#wpUploadDescription'), validator: null, changes: {}};
		}

		// Validador
		for (var i = 0; i < UploadValidator.files.length; i++) {
			UploadValidator.files[i].validator = new ImageTitleValidator(UploadValidator.files[i].inputName.val());
			UploadValidator.files[i].validator.validate(UploadValidator.onValidate);
		}
		return false;
	},
	onValidate: function(v) {
		// No hacer nada hasta que no se hayan validado todos
		for (var i = 0; i < UploadValidator.files.length; i++) {
			if (!UploadValidator.files[i].validator || !UploadValidator.files[i].validator.completed) {
				return;
			}
		}
		// Se ha realizado la validación sobre todos los archivos: ahora hay que ir actualizando o mostrando mensajes al usuario
		// 1. Validar blacklists
		for (var i = 0; i < UploadValidator.files.length; i++) {
			var vs = UploadValidator.files[i].validator.validations;
			if (vs.blacklist == 1) {
				UploadValidator.showDlg('El nombre del archivo que intentas subir no está permitido. Algunas de las causas son: el nombre del archivo no es descriptivo o es incorrecto, contiene excesivas mayúsculas o es una trainer card. Léete de nuevo las instrucciones de subida de archivos de esta página para ver cómo resolver este problema.', i);
				return;
			}
			if (vs.thumb == 2) { // Thumb existente
				var szNormName = UploadValidator.files[i].validator.suggestName.gen;
				UploadValidator.showDlg('El archivo que intentas subir ya está subido: <a href="'+wgArticlePath.replace('$1', 'Archivo:'+encodeURIComponent(szNormName.replace(/ /g, '_')))+'" target="_blank" class="normname"></a>.<br />En ningún caso debe subirse de nuevo un archivo que ya existe con otro copiado de otro sitio y en una resolución inferior.<br />Usa el archivo existente en vez de subirlo de nuevo. Lee la ayuda para saber cómo cambiar el tamaño de la imagen dentro de un artículo.', i, {normname:szNormName});
				return;
			} else if (vs.thumb == 1) { // Thumb no existente
				UploadValidator.showDlg('El archivo que intentas subir parece provenir de otro sitio. El nombre del archivo no es apropiado aquí. Por favor, lee las instrucciones para nombrar el archivo correctamente que encontrarás al inicio de este formulario.', i);
				return;
			}
		}
		var licencia = ($('#wpLicense').val() || '');
		// 2. Validaciones específicas por licencia
		// 2.1. Imágenes de episodio
		if (licencia == 'ScreenshotTV') {
			for (var i = 0; i < UploadValidator.files.length; i++) {
				if (!UploadValidator.files[i].validator.suggestName.ep) {
					UploadValidator.showDlg('Si la imagen es la captura de un episodio o película, debe nombrarse como se indica en las instrucciones de subida de archivos.', i);
					return;
				}
			}
		}

		// 3. Actualizar los nombres con las correcciones automáticas aplicadas
		for (var i = 0; i < UploadValidator.files.length; i++) {
			UploadValidator.files[i].inputName.val(UploadValidator.files[i].validator.suggestName.gen);
		}

		// 3.1. En este punto miramos si hay nombres duplicados ya. Luego se mira más adelante si además hay sugerencias de cambios de nombre
		if (!UploadValidator.validaNombresDuplicados()) {
			return;
		}

		// 4. Validaciones y cambios extra. Almacenamos los cambios propuestos, y luego pedimos confirmación al usuario
		// 4.1. Detectar todos los cambios propuestos
		var haycambios = false;
		for (var i = 0; i < UploadValidator.files.length; i++) {
			var f = UploadValidator.files[i];
			if (UploadValidator.procesarCambiosEP(f, licencia)) {
				haycambios = true;
			} else {
				// Si no se sugieren cambios para casos específicos, validar licencia-descripción: Uno de los dos debe estar informado
				if (licencia == '' && UploadValidator.files[i].inputDesc.val() == '') {
					UploadValidator.showDlg('Debes seleccionar una licencia, o bien incluir la licencia o el origen y las categorías apropiadas en el espacio reservado para la descripción.', i);
					return;
				}
			}
		}

		// Si no ha saltado ninguna validación anterior, es que está todo correcto para nosotros. Enviamos el formulario.
		if (!haycambios) {
			UploadValidator.doSubmit();
		} else {
			// 4.2. Mostrar las validaciones al usuario
			UploadValidator.showChanges();
		}
	},
	procesarCambiosEP: function(file, licencia) {
		var n = file.validator.suggestName.ep;
		if (!n) return false;
		var c = file.changes;
		var d = file.inputDesc.val();
		// Licencia
		if (licencia != 'ScreenshotTV') {
			if (!UploadValidator.re_EPlic.test(d)) {
				c.license = 'ScreenshotTV';
				c.has = true;
			}
		}
		// Nombre
		if (n != file.inputName.val()) {
			c.name = n;
			c.has = true;
		}
		// Categorías
		var len = n.indexOf('_');
		if (len < 0) { // Caso de EP000.png
			len = n.indexOf('.');
		}
		var arReEP = UploadValidator.re_EP.exec(n);
		var epcode = arReEP[0];
		var arRe = UploadValidator.re_EPcat.exec(d);
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
	showChanges: function() {
		for (var i = 0; i < UploadValidator.files.length; i++) {
			var c = UploadValidator.files[i].changes;
			if (!c.has || c.status != 0) continue;
			var cont = c.prompt;
			var tx = {};
			if (c.license) {
				cont += '<br/>Cambiar la licencia a <tt class="license"></tt>.';
			}
			if (c.name) {
				cont += '<br/>Cambiar nombre por <tt class="name"></tt>.';
			}
			if (c.cat) {
				if (c.replcat) {
					cont += '<br/>Reemplazar categoría <tt class="replcat"></tt>.';
				} else {
					cont += '<br/>Añadir categoría <tt class="cat"></tt>.';
				}
			}
			cont += '<br/><br/><input type="button" id="IV_change" value="Subir con los cambios propuestos"/> <input type="button" id="IV_same" value="Subir sin cambiar nada"/> <input type="button" id="IV_cancel" value="Cancelar"/>';

			UploadValidator.showDlg(cont, i, {license:c.license, name:c.name, replcat:c.replcat, cat:c.cat});
			$('#IV_change').add('#IV_same').click(function(it) {
				return function() {
					//Thickbox.remove();
					$('#TB_window').find('input').unbind();
					UploadValidator.files[it].changes.status = (this.id == 'IV_change' ? 1 : -1);
					UploadValidator.showChanges();
				};
			}(i));
			$('#IV_cancel').click(Thickbox.remove);

			// Salimos del bucle. El dialogo devolverá la ejecución al siguiente elemento
			return;
		}

		if (!UploadValidator.validaNombresDuplicados()) {
			return;
		}

		// Aquí porque el diálogo se reemplaza en vez de cerrarse.
		// Nota: NO llamar a showDlg de nuevo en una función hasta salir del evento, pues TB estaría cerrándose y daría un error
		Thickbox.remove();
		// Si no pasó por el return de arriba es que se ha tomado ya la decisión sobre todos. Realizar acciones
		UploadValidator.applyChanges();
	},
	// Valida que no haya nombres de archivo duplicados. Debe hacerse al final de todo
	validaNombresDuplicados: function() {
		var nombres = {};
		for (var i = 0; i < UploadValidator.files.length; i++) {
			var f = UploadValidator.files[i];
			var c = f.changes;
			var n = f.inputName.val()
			if (c.has && c.status == 1 && c.name) {
				n = c.name;
			}
			if (nombres[n]) {
				UploadValidator.showDlg('Algunos de los archivos que intentas subir tienen el mismo nombre: <tt class="name"></tt>. Por favor, corrígelo', -1, {name: n});
				return false;
			} else {
				nombres[n] = true;
			}
		}
		return true;
	},
	// Había cambios propuestos y se han aceptado / rechazado. Aquí se aplican los cambios a los campos del formulario
	applyChanges: function() {
		// Primero ver qué hacer con la licencia, pues afecta a todos
		var licencia = ($('#wpLicense').val() || '');
		var licenciaComun = null;
		for (var i = 0; i < UploadValidator.files.length; i++) {
			var c = UploadValidator.files[i].changes;
			var lictmp = licencia;
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
		if (licenciaComun !== null) {
			// Hay una licencia común, la informamos
			$('#wpLicense').val(licenciaComun);
		} else {
			$('#wpLicense').children('option').get(0).selected = true;
		}
		for (var i = 0; i < UploadValidator.files.length; i++) {
			var f = UploadValidator.files[i];
			var c = f.changes;
			if (licencia != '' && licenciaComun === null && !(c.has && c.status == 1 && c.license)) {
				// se debe especificar licencia por archivo
				f.inputDesc.val(f.inputDesc.val()+'\n== Licencia ==\n{{'+licencia+'}}');
			}
			if (!c.has) {
				continue;
			}
			if (c.status == 1) {
				if (c.license && licenciaComun === null) {
					f.inputDesc.val(f.inputDesc.val()+'\n== Licencia ==\n{{'+c.license+'}}');
				}
				if (c.name) {
					f.inputName.val(c.name);
				}
				if (c.replcat) {
					f.inputDesc.val(f.inputDesc.val().replace(c.replcat, c.cat));
				} else if (c.cat){
					f.inputDesc.val(f.inputDesc.val().length ? (f.inputDesc.val() + '\n' + c.cat) : c.cat);
				}
			} else {
				if (c.license) {
					f.inputDesc.val('<!-- Se ha sugerido el cambio de licencia a '+c.license+' pero se ha omitido -->\n'+f.inputDesc.val());
				}
				if (c.name) {
					f.inputDesc.val('<!-- Se ha sugerido el cambio de nombre a '+c.name+' pero se ha omitido -->\n'+f.inputDesc.val());
				}
				if (c.replcat) {
					f.inputDesc.val('<!-- Se ha sugerido reemplazar la categoría '+c.replcat+' por '+c.cat+' pero se ha omitido -->\n'+f.inputDesc.val());
				} else if (c.cat){
					f.inputDesc.val('<!-- Se ha sugerido añadir la categoría '+c.cat+' pero se ha omitido -->\n'+f.inputDesc.val());
				}
			}
		}
		UploadValidator.doSubmit();
	},
	doSubmit: function() {
		UploadValidator.unlock();
		UploadValidator.skip = true;
		if (window.wgCanonicalSpecialPageName == 'MultipleUpload') {
			UploadValidator.preSubmitMultipleUploadForm();
		}
		// No se puede hacer la llamada directa, pues si no hay validación asíncrona aun estamos dentro del evento submit, y este al cancelar el evento evitará que podamos hacer otro submit seguido
		setTimeout(function(){ UploadValidator.submitBtn.click(); }, 100);
	},
	// Muestra la ventana con el mensaje al usuario.
	// @param cont [string]: contenido HTML
	// @param index [number]: índice del archivo (para que muestre el archivo al que va dirigida la validación)
	// @param texts [object]{name,value}: claves-valor para reemplazar elementos del parámetro @{cont}
	showDlg: function(cont) {
		var filename = '';
		var index = -1;
		var texts = {};
		for (var i = 1; i < arguments.length; i++) {
			switch (typeof arguments[i]) {
				case 'number':
					index = arguments[i];
					break;
				case 'object':
					texts = arguments[i];
					break;
			}
		}
		if (index >= 0 && UploadValidator.files.length > 1) {
			texts['filename'] = UploadValidator.files[index].inputName.val();
			filename = '<tt>Archivo: <span class="filename"></span></tt><br />';
		}
		if ($('#TB_window').exists()) {
			$('#TB_ajaxContent').html(filename+cont);
			Thickbox.position();
		} else {
			Thickbox.preload();
			$('#TB_window').width(500).append('<div id="TB_title"><div id="TB_closeAjaxWindow"><a href="#" id="TB_closeWindowButton" title="Cerrar [ESC]">cerrar</a></div></div><div id="TB_ajaxContent">'+filename+cont+'</div>')
				.bind('unload',function() {
					UploadValidator.unlock();
					$('#TB_window').find('input').unbind();
				});
			$('#TB_closeWindowButton').click(Thickbox.remove);
			$(document).bind('keyup.thickbox', Thickbox.keyListener);
			Thickbox.width = 500;
			Thickbox.height = $('#TB_window').height();
			Thickbox.position();
			Thickbox.displayClean();
		}
		for (var elid in texts) {
			if (typeof texts[elid] == 'string') {
				$('#TB_ajaxContent').find('.'+elid).text(texts[elid]).removeClass(elid);
			}
		}
	},
	unlock: function() {
		if (UploadValidator.lock) {
			UploadValidator.lock = false;
			UploadValidator.submitBtn.removeAttr('disabled');
		}
	},
	setupMultipleUploadForm: function() {
		var t = $('#mw-htmlform-source').get(0);
		if (!t) return;
		var oStoredDescs = UploadValidator.parseMultipleUploadFormHack();
		var rsl = t.tBodies[0].rows.length - 2;
		for (var field = ((rsl / 2) - 1), i = (rsl - 1); i >= 0; i -= 2, field--) {
			var tr = t.tBodies[0].insertRow(i+1);
			var desc = oStoredDescs[UploadValidator.normalizePageName( $('#wpDestFile'+field.toString()).val() || '' )];
			$(tr.insertCell(0)).addClass('mw-input').append('<textarea id="wpUploadDescription'+field.toString()+'"></textarea>');
			$(tr.insertCell(0)).addClass('mw-label').append('<label for="wpUploadDescription'+field.toString()+'">Descripción</label>');
			$(tr).addClass('mw-htmlform-field-HTMLTextField');
			if (desc && desc != '') {
				$('#wpUploadDescription'+field.toString()).val(desc);
			}
		}
		$('#wpUploadDescription').parents('tr').eq(0).css('display', 'none');
	},
	parseMultipleUploadFormHack: function() {
		var oRet = {};
		var tmpl = $('#wpUploadDescription').val();
		var idx = -1;
		var tag = '';
		var prevname = '';
		var previdx = tmpl.indexOf('{{subst:#switch:{{subst:PAGENAME}}|');
		if (previdx == -1) return oRet;
		for (var i = 0; $('#wpDestFile'+i.toString()).exists(); i++) {
			var n = UploadValidator.normalizePageName($('#wpDestFile'+i.toString()).val());
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
		return oRet;
	},
	preSubmitMultipleUploadForm: function() {
		var txtdesc = '{{subst:#switch:{{subst:PAGENAME}}';
		var t = $('#mw-htmlform-source').get(0);
		var haydesc = false;
		for (var i = 0; ($('#wpDestFile'+i.toString()).val() || '') != ''; i++) {
			var desc = $.trim( $('#wpUploadDescription'+i.toString()).val() );
			if (desc.length) {
				haydesc = true;
				txtdesc += '|' + UploadValidator.normalizePageName($('#wpDestFile'+i.toString()).val()) + ' = ' + $('#wpUploadDescription'+i.toString()).val();
			}
		}
		txtdesc += '|}}'
		if (!haydesc) txtdesc = '';
		$('#wpUploadDescription').val(txtdesc).parents('tr').eq(0).css('display', '');
	},
	normalizePageName: function(page) {
		var ret = '';
		if (page.length) {
			ret += page.substr(0, 1).toUpperCase();
		}
		if (page.length > 1) {
			ret += page.substr(1);
		}
		ret = ret.replace(/_/g, ' ');
		return ret;
	}
};

if (wgNamespaceNumber == -1 && (window.wgCanonicalSpecialPageName == 'Upload' || window.wgCanonicalSpecialPageName == 'MultipleUpload')) {
	$(UploadValidator.init);
}
/* </pre> */
