// <pre>
/******************************
 * CreaEnlacesDex: Obtiene la información esencial de las plantillas Cuadro Pokémon o
 * Cuadro Movimiento para generar una lista de enlaces a otras Pokédex. Guarda en una cookie
 * la información para poder generar la información al editar una sección cualquiera o previsualizar
 *
 * Copyright (C) 2007 - 2012 Jesús Martínez Novo ([[User:Ciencia Al Poder]])
 * This program is free software; you can redistribute it and/or modify
 *   it under the terms of the GNU General Public License as published by
 *   the Free Software Foundation; either version 2 of the License, or
 *   (at your option) any later version
 */
window.CreaEnlacesDex = (function () {
	var T_POKEMON = 'p',
	T_MOVIMIENTO = 'm',
	T_BAYA = 'b',
	// Constantes
	T_EN = ' (en inglés)',
	T_G = ' Generación',
	T_UBP = 'http://bulbapedia.bulbagarden.net/wiki/',
	T_UPS = 'http://pokemon-stats.com/pokemon/fichas_',
	T_UGN = 'http://www.guiasnintendo.com/',
	T_UGN3 = T_UGN+'3_GB_GameBoy/',
	T_UGN1 = T_UGN+'1_GAMEBOY_ADVANCE/',
	T_VEE = 'http://veekun.com/dex/',
	T_USP = 'http://www.serebii.net/pokedex',
	T_USA = 'http://www.serebii.net/attackdex',
	T_ULP = 'http://www.legendarypokemon.net/',
	T_GN = 'Guías Nintendo',
	T_PS = 'Pokémon-stats',
	T_S = 'Serebii',
	T_L = 'Legendary',
	T_LP = 'Legendary Pokémon: ',
	SHTML = '.shtml',
	PHP = '.php',
	_generaciones = ['Primera', 'Segunda', 'Tercera', 'Cuarta', 'Quinta'],
	_cookieTag = 'DexItem',
	_vars = {
		// Tipo: Pokémon o movimiento
		tipo: null,
		// Nombre del artículo
		nombreArt: null,
		// Nombre del Pokémon/Movimiento
		nombre: null,
		// Nombre en inglés
		ingles: null,
		// Número en Pokédex Nacional
		num: null,
		// Número en Pokédex Hoenn
		hoenn: null,
		// Generación
		generacion: null
	},
	_renderFn = null,
	_renderLink = null,
	_rendered = false,
	// ** Funciones **
	// Inicio
	init = function () {
		if(getFromPage()||getFromCookie()) {
			saveOnExit();
			if (_vars.tipo === T_POKEMON) genPoke();
			if (_vars.tipo === T_MOVIMIENTO) genMov();
			if (_vars.tipo === T_BAYA) genBaya();
			setToCookie();
		}
	},
	// Obtener guardado de cookie
	// formato: "tipo:p|nombre:asdf|num:000|hoenn:000"
	getFromCookie = function () {
		var cookieStr = $.cookies.get(_cookieTag);
		if (!cookieStr) {
			return false;
		}
		for (var i = 0, p = cookieStr.split('|'); i < p.length; i++) {
			var ar = p[i].split(':');
			if (ar.length == 2) _vars[ar[0]] = ar[1];
		}
		if (!_vars.nombreArt || !_vars.nombre) {
			return false;
		}
		return (_vars.nombreArt === window.wgPageName);
	},
	// Obtener de la página
	getFromPage = function () {
		var eNombrePoke = $('#nombrepokemon'),
			eNumNacional = $('#numeronacional'),
			eNombreMov = $('#nombremovimiento'),
			eNumBaya = $('#numerobaya'), n;
		_vars.nombreArt = window.wgPageName;
		if ( eNombrePoke.exists() && eNumNacional.exists() ) {
			_vars.tipo = T_POKEMON;
			_vars.nombre = $.trim(eNombrePoke.text());
			n = parseInt($.trim(eNumNacional.text()), 10);
			_vars.num = (!isNaN(n) && n > 0) ? n : 0;
			n = parseInt($.trim($('#numerohoenn').text()), 10);
			_vars.hoenn = (!isNaN(n) && n > 0) ? n : 0;
			return true;
		} else if (eNombreMov.exists()) {
			_vars.tipo = T_MOVIMIENTO;
			_vars.nombre = $.trim(eNombreMov.text());
			_vars.ingles = $.trim($('#nombreingles').text());
			for (var i = 0, gentxt = $.trim(eGen.text()); i < _generaciones.length; i++) {
				if (_generaciones[i] === gentxt) {
					_vars.generacion = i+1;
					break;
				}
			}
			return true;
		} else if (eNumBaya.exists()) {
			_vars.tipo = T_BAYA;
			_vars.nombre = _vars.nombreArt;
			_vars.ingles = $.trim($('#nombreingles').text());
			n = parseInt($.trim($('#numerobaya').text()), 10);
			_vars.num = (!isNaN(n) && n > 0) ? n : 0;
			return true;
		}
		return false;
	},
	// Setea al salir
	saveOnExit = function () {
		$(window).bind('unload', setToCookie());
	},
	// Setea en cookie
	setToCookie = function () {
		var sz = [];
		for (var elem in _vars) {
			if (_vars[elem]) sz.push(elem, ':', _vars[elem], '|');
		}
		if (sz.length > 0) sz.pop();
		$.cookies.set(_cookieTag, sz.join(''));
	},
	zPadLeft = function(item, num) {
		var sz = [];
		for (var i = item.length; i < num; i++) {
			sz.push(0);
		}
		sz.push(item);
		return sz.join('');
	},
	genPoke = function () {
		var m = _vars.nombre,
			n = _vars.num,
			sn = n.toString(),
			h = 0;
		if (_vars.hoenn !== null && !isNaN(parseInt(_vars.hoenn, 10))) {
			h = parseInt(_vars.hoenn, 10);
		}
		link('http://es.wikipedia.org/wiki/'+m,'Wikipedia','Wikipedia en español');
		// Guias nintendo
		n && n<=150 && link(T_UGN3+'pokemon/pokemon_sp/Pokedex/'+m.toLowerCase().replace('mr. ','')+'.asp',T_GN+' RAA',T_GN+': 1ª'+T_G);
		n && n<=251 && link(T_UGN3+'pokeoroplata/Pokedex/'+zPadLeft(sn,2)+'-'+m.replace(' ','')+'.htm',T_GN+' OPC',T_GN+': 2ª'+T_G);
		h && h<=200 && link(T_UGN1+'pokemonrubizafiro/pok_rubi_zafiro_SP/pokedex/pokemon'+zPadLeft(h.toString(),3)+m.toLowerCase()+'.htm',T_GN+' RZ',T_GN+': Pokémon ediciones Rubí y Zafiro');
		h && h<=202 && link(T_UGN1+'Pokemon_Esmeralda/pok_esmeralda_SP/pokedex/pokemon'+zPadLeft(h.toString(),3)+m.toLowerCase()+'.html',T_GN+' E(H)',T_GN+': Pokémon edición Esmeralda, Pokédex de Hoenn');
		n && n<=386 && link(T_UGN1+'Pokemon_Esmeralda/pok_esmeralda_SP/pokedex_nacional/'+zPadLeft(sn,3)+'.html',T_GN+' E(N)',T_GN+': Pokémon edición Esmeralda, Pokédex Nacional');
		n && n<=386 && link(T_UGN1+'pokemon_rojofuego_verdehoja/pokemon_rojofuego_verdehoja_sp/pokedex/'+zPadLeft(sn,3)+'.html',T_GN+' RfVh',T_GN+': Pokémon ediciones Rojo Fuego y Verde Hoja');
		n && n<=490 && link(T_UGN+'0_NINTENDO_DS/Pokemon_perla_diamante/Pokemon_perla_diamante_sp/pokedex_nacional/'+zPadLeft(sn,3)+'.html',T_GN+' DP',T_GN+': 4ª'+T_G);
		// pokemon-stats
		if (n && n <= 151){
			link(T_UPS+'ra/'+zPadLeft(sn,3)+PHP, T_PS+' RA',T_PS+': Rojo y Azul');
			link(T_UPS+'amarillo/'+zPadLeft(sn,3)+PHP, T_PS+' A',T_PS+': Amarillo');
		}
		if (n && n <= 251){
			link(T_UPS+'op/'+zPadLeft(sn,3)+PHP,T_PS+' OP',T_PS+': Oro y Plata');
			link(T_UPS+'cristal/'+zPadLeft(sn,3)+PHP,T_PS+' C',T_PS+': Cristal');
		}
		if (h && h <= 386){
			link(T_UPS+'rz/'+zPadLeft(h.toString(),3)+PHP, T_PS+' RZ',T_PS+': Rubí y Zafiro');
			link(T_UPS+'esmeralda/'+zPadLeft(h.toString(),3)+PHP,T_PS+' E',T_PS+': Esmeralda');
		}
		n && n <= 386 && link(T_UPS+'rfvh/'+zPadLeft(sn,3)+PHP,T_PS+' RV',T_PS+': Rojo Fuego y Verde Hoja');
		n && n <= 493 && link(T_UPS+'dp/'+zPadLeft(sn,3)+PHP,T_PS+' DP',T_PS+': Diamante y Perla');
		// Pokexperto
		n && link('http://www.pokexperto.net/index2.php?seccion=nds/nationaldex/pkmn&pk='+sn,'Pokexperto 3-5Gen','Pokexperto: 3ª a 5ª'+T_G);
		// Otras/otros idiomas
		link('http://en.wikipedia.org/wiki/'+m,'Wikipedia [en]','Wikipedia'+T_EN);
		link('http://pokemon.wikia.com/wiki/'+m,'TPE [en]','The Pokemon Encyclopedia'+T_EN);
		link(T_UBP+m+'_(Pokémon)', 'Bulbapedia [en]','Bulbapedia'+T_EN);
		link(T_VEE+'pokemon/'+m.toLowerCase(),'Veekun [en]','Veekun'+T_EN);
		n && n <= 386 && link(T_ULP+'rs/pokedex/'+m,T_L+' 3Gen [en]',T_LP+'3ª'+T_G+T_EN);
		n && n <= 493 && link(T_ULP+'dp/pokedex/'+m,T_L+' 4Gen [en]',T_LP+'4ª'+T_G+T_EN);
		n && n <= 251 && link(T_USP+'/'+zPadLeft(sn,3)+SHTML,T_S+' 1-2Gen [en]',T_S+': 1ª y 2ª'+T_G+T_EN);
		n && n <= 386 && link(T_USP+'-rs/'+zPadLeft(sn,3)+SHTML,T_S+' 3Gen [en]',T_S+': 3ª'+T_G+T_EN);
		n && n <= 493 && link(T_USP+'-dp/'+zPadLeft(sn,3)+SHTML,T_S+' 4Gen [en]',T_S+': 4ª'+T_G+T_EN);
		n && n <= 649 && link(T_USP+'-bw/'+zPadLeft(sn,3)+SHTML,T_S+' 5Gen [en]',T_S+': 5ª'+T_G+T_EN);
	},
	genMov = function () {
		var m = _vars.nombre,
			i = (_vars.ingles || 0),
			g = (parseInt(_vars.generacion, 10) || 1);
		i && g <= 5 && link(T_UBP+i.replace(new RegExp('\\b(\\w)', 'g'), function(s,p){return p.toUpperCase();})+'_(move)','Bulbapedia [en]','Bulbapedia'+T_EN);
		i && g <= 5 && link(T_VEE+'moves/'+i.toLowerCase(),'Veekun [en]','Veekun'+T_EN);
		i && g <= 3 && link(T_ULP+'rs/attacks/'+i,T_L+' 3Gen [en]',T_LP+'3ª'+T_G+T_EN);
		i && g <= 4 && link(T_ULP+'dp/attacks/'+i,T_L+' 4Gen [en]',T_LP+'4ª'+T_G+T_EN);
		i && g <= 3 && link(T_USA+'/'+i.toLowerCase().replace(new RegExp('\\s', 'g'),'')+SHTML,T_S+' 3Gen [en]',T_S+': 3ª'+T_G+T_EN);
		i && g <= 4 && link(T_USA+'-dp/'+i.toLowerCase().replace(new RegExp('\\s', 'g'),'')+SHTML,T_S+' 4Gen [en]',T_S+': 4ª'+T_G+T_EN);
		i && g <= 5 && link(T_USA+'-bw/'+i.toLowerCase().replace(new RegExp('\\s', 'g'),'')+SHTML,T_S+' 5Gen [en]',T_S+': 5ª'+T_G+T_EN);
		i && g <= 4 && link('http://www.smogon.com/dp/moves/'+i.toLowerCase().replace(new RegExp('\\s', 'g'),'_'),'Smogon 4Gen [en]','Smogon: 4ª'+T_G+T_EN);
	},
	genBaya = function () {
		var n = _vars.num,
			sn = n.toString();
		link('http://www.pokexperto.net/index2.php?seccion=nds/berrydexDS&baya='+sn, 'Pokexperto 4Gen', 'Pokexperto: 4ª'+T_G);
		link(T_VEE+'items/berries/'+_vars.ingles.toLowerCase(),'Veekun [en]','Veekun'+T_EN);
		link(T_ULP+'berrydex?berry='+sn,T_L+' 4Gen [en]',T_LP+'4ª'+T_G+T_EN);
		link('http://www.serebii.net/berrydex-dp/'+zPadLeft(sn,2)+SHTML,T_S+' 4Gen [en]',T_S+': 4ª'+T_G+T_EN);
	},
	link = function(url, text, caption) {
		if (!_rendered && _renderFn) {
			_renderFn(_vars.tipo);
			_rendered = true;
		}
		if (_rendered && _renderLink) {
			_renderLink(url, text, caption);
		}
	}
	registerRenderFn = function(fn) {
		if (typeof fn === 'function') {
			_renderFn = fn;
		}
	},
	registerLinkFn = function(fn) {
		if (typeof fn === 'function') {
			_renderLink = fn;
		}
	};

	// Funciones publicadas
	return {
		init: init,
		registerRenderFn: registerRenderFn,
		registerLinkFn: registerLinkFn
	};
})();
// </pre>
