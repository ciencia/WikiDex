if (!mw.config.get('wgValidators', null)) {
	mw.config.set('wgValidators', []);
}

(function(wgValidators) {
	'use strict';

	var _blacklists = [ // Busqueda en el nombre del archivo, sin extensión
		/[A-Za-z0-9]{16,}/, // carros de letras
		/^[A-Za-z0-9]{0,2}$/, // solo un o dos caracteres (el minimo es 3, para películas)
		/\d{11,}/,
		/[\\\/\|<>#"=\?]/, // Caracteres ilegales
		/^\d+$/, // Solo números
		/\.{2,}/, // Varios puntos seguidos
		/\-{2,}/, // Varios guiones
		/[A-Z]{5,}/, // Mayúsculas excesivas
		/-\d+-/, // Sufijos raros de venir de otras webs
		/image[ns]? ?\(?\d+\)?/i,
		/^img/i,
		/thumb/i,
		/_by_/i, // AA by BB
		/trainer[ \-]?card/i, // Trainercards
		/^fb\.\d+/i,
		/Pok[ée]mon .+ espa[ñn]ol \d+/i, // Screenshots de emuladores
		/nuevopok[eéÉ]/i, // Nombres a evitar
		/new[ \-]?pok[eéÉ]/i,
		/wallpaper/i,
		/unnamed/i,
		/escanear/i,
		/CIMG/i,
		/^.{0,5}copia de/i,
		/pxp/i,
		/\bpage\b/i,
		/\bevo\b/i,
		/^(January|February|March|April|May|June|July|August|September|October|November|December)/, // Web oficial XY
		/^(DP|AG|IL)\s?\d+/i, // Episodios en formato DP
		/(jpg|jpeg|png|gif|bmp)$/i // Dobles extensiones
	],
	_whitelists = [ // Busqueda en el nombre del archivo, sin extensión
		/superentrenamiento/i
	],
	_extractName = function(title) {
		var dot = title.lastIndexOf('.');
		return dot > 0 ? title.substr(0, dot) : '';
	},
	_checkBlackLists = function(name) {
		var bl = false;
		for (var i = _blacklists.length - 1; i >= 0; i--) {
			if (_blacklists[i].test(name)) {
				bl = true;
				for (var j = _whitelists.length - 1; j >= 0; j--) {
					if (_whitelists[j].test(name)) {
						bl = false;
						break;
					}
				}
				if (bl) {
					return true;
				}
			}
		}
		return false;
	};
	
	wgValidators.push({
		name: 'BlackListWikiDex',
		priority: 1,
		validate: function(ui) {
			var name = _extractName(ui.title);
			if (_checkBlackLists(name)) {
				return {
					disallow: 'El nombre del archivo que intentas subir no está permitido. Algunas de las causas son: el nombre del archivo no es descriptivo o es incorrecto, contiene excesivas mayúsculas, o es una trainer card. ' +
						'Lee de nuevo las instrucciones de subida de archivos de esta página para ver cómo resolver este problema.'
				};
			}
		}
	});

})(mw.config.get('wgValidators'));

mw.config.get('wgValidators').push({
	name: 'NoExt',
	priority: 0,
	validate: function(ui) {
		'use strict';
		var dot = ui.title.lastIndexOf('.');
		if (dot == -1) {
			return {
				disallow: 'El archivo que intentas subir no tiene extensión (.png o .jpg, por ejemplo). No puedes subir archivos sin extensión.'
			};
		}
	}
});

(function(wgValidators) {
	'use strict';
	var _reEmpty = /^[ \.]*$/;

	wgValidators.push({
		name: 'NoLicenseNoDesc',
		priority: 900,
		validate: function(ui) {
			if (_reEmpty.test(ui.license) && _reEmpty.test(ui.description)) {
				return {
					disallow: 'Debes seleccionar una licencia, o bien incluir la licencia o el origen y las categorías apropiadas en el espacio reservado para la descripción.'
				};
			}
		}
	});

})(mw.config.get('wgValidators'));

(function(wgValidators) {
	'use strict';

	var _re_trim_start = /^\s+/,
	_re_trim_end = /[.\- ]+$/,
	_re_ns = /^(Archivo|File|Image|Imagen)[.\-:]+/i; // Espacio de nombres
	
	wgValidators.push({
		name: 'CorrNombreWikiDex',
		priority: -900,
		validate: function(ui) {
			var dot = ui.title.lastIndexOf('.'), ext, name;
			if (dot == -1) return;
			name = ui.title.substr(0, dot);
			// Extensión en minúscula
			ext = ui.title.substr(dot + 1).toLowerCase();
			// Borrar espacios (y otros caracteres) antes y después del nombre y la extensión
			name = name.replace(_re_trim_start, '').replace(_re_trim_end, '');
			ext = ext.replace(_re_trim_start, '').replace(_re_trim_end, '');
			// Mayúscula la primera
			name = name.substr(0, 1).toUpperCase() + name.substr(1);
			// Sin namespace
			if (_re_ns.test(name)) {
				name = name.replace(_re_ns, '');
			}
			// Normalizando jpeg
			if (ext == 'jpeg') {
				ext = 'jpg';
			}
			return { title: name + '.' + ext };
		}
	});
})(mw.config.get('wgValidators'));

(function(wgValidators) {
	'use strict';
	var _re_ep = /^(EP|P|EE|EH|OP|OPJ|EDJ|PK|VI|PO|SME|PL)[ .:\-]*(\d+)[ .:\-]*/i,
		_epLicense = 'ScreenshotTV';

	wgValidators.push({
		name: 'ImagenEpisodio',
		priority: 10,
		validate: function(ui) {
			var reRes, len, dot, name, ext, epName, res, hasCat = false, hasLic = false;
			dot = ui.title.lastIndexOf('.');
			name = ui.title.substr(0, dot);
			ext = ui.title.substr(dot);
			reRes = _re_ep.exec(name);
			// Licencia
			if (ui.license == _epLicense) {
				hasLic = true;
			} else {
				for (var it = 0; it < ui.templates.length; it++) {
					if (ui.templates[it] == _epLicense) {
						hasLic = true;
						break;
					}
				}
			}
			if (!reRes && !hasLic) {
				return;
			}
			// Licencia, pero nombre incorrecto
			if (hasLic && !reRes) {
				return { disallow: 'Si la imagen es la captura de un episodio o película, debe nombrarse como se indica en las instrucciones de subida de archivos.' };
			}
			res = { filetype: 'Imagen de un episodio o película' };
			// Nombre probable
			epName = reRes[1].toUpperCase();
			// Solo EP tiene 3 dígitos. El resto 2
			len = (epName == 'EP' ? 3 : 2);
			// Completamos 0 que hagan falta
			len -= reRes[2].length;
			while (len > 0) {
				epName += '0';
				len--;
			}
			epName += reRes[2];
			if (name.length > reRes[0].length) {
				name = name.substr(reRes[0].length);
				name = epName + ' ' + name.substr(0, 1).toUpperCase() + name.substr(1) + ext;
			} else {
				name = epName + ext;
				if (ext != '.png') {
					return { disallow: 'Las imágenes de episodio cuyo nombre sea el número de episodio, deben subirse en formato PNG. Por favor convierte la imagen a formato PNG antes de subirla, o agrega un texto descriptivo detrás del número del episodio.' };
				}
			}
			if (name != ui.title) {
				res.title = name;
			}
			// Categoría
			res.removed_categories = [];
			for (var ic = 0; ic < ui.categories.length; ic++) {
				if (ui.categories[ic] != epName) {
					if (_re_ep.test(ui.categories[ic])) {
						res.removed_categories.push(ui.categories[ic]);
					}
				} else {
					hasCat = true;
				}
			}
			if (!hasCat) {
				res.added_categories = [ epName ];
			}
			// Licencia
			if (!hasLic) {
				res.license = _epLicense;
			}
			if (res.license || res.removed_categories.length > 0 || (res.added_categories in res && res.added_categories.length > 0) || res.title) {
				res.note = 'La imagen parece seguir las convenciones de nombrado de imágenes de episodios o películas. Si realmente se trata de este tipo de imagen, deberías aceptar los cambios propuestos.';
				return res;
			}
		}
	});
})(mw.config.get('wgValidators'));

(function(wgValidators) {
	'use strict';
	var _re_scaled = /^\d+px-/,
	_mdoAsyncValidation = function() {
		var params = {
			action: 'query',
			titles: 'File:'+this.name,
			prop: 'imageinfo',
			iiprop: 'url'
		}, api = new mw.Api();
		api.get(params).done( function(self) {
			return function(data) {
				_mapiResult.call(self, data);
			};
		}(this) ).fail( function(self) {
			return function() {
				_resultNotExists.call(self);
			};
		}(this) );
	},
	_mapiResult = function(data) {
		if (data.error) {
			_resultNotExists.call(this);
			return;
		}
		for (var pageid in data.query.pages) {
			if (!data.query.pages[pageid].imageinfo) {
				// No existe
				_resultNotExists.call(this);
			} else {
				// Existe
				_resultExists.call(this, data.query.pages[pageid].title);
			}
		}
	},
	_resultNotExists = function() {
		this.fnDoneCallback({
			disallow: 'El archivo que intentas subir parece provenir de otro sitio. El nombre del archivo no es apropiado aquí. Por favor, lee las instrucciones para nombrar el archivo correctamente que encontrarás al inicio de este formulario.'
		});
	},
	_resultExists = function(title) {
		this.fnDoneCallback({
			disallow: 'El archivo que intentas subir ya existe: ' + title + '. En ningún caso debe subirse de nuevo un archivo que ya existe, copiado de otro sitio y en una resolución inferior. Usa el archivo existente en vez de subirlo de nuevo. Lee la ayuda para saber cómo cambiar el tamaño de la imagen dentro de un artículo.'
		});
	},
	ValidateThumb = function(name) {
		this.name = name;
		this.fnDoneCallback = null;
	};

	wgValidators.push({
		name: 'Thumb',
		priority: 5,
		validate: function(ui) {
			var vt, reRes;
			if (_re_scaled.test(ui.title)) {
				reRes = _re_scaled.exec(ui.title);
				vt = new ValidateThumb(ui.title.substr(reRes[0].length));
				return function(self) {
					return function(fnDoneCallback) {
						self.fnDoneCallback = fnDoneCallback;
						_mdoAsyncValidation.call(self);
					};
				}(vt);
			}
		}
	});
	
})(mw.config.get('wgValidators'));
