// <pre>
/******************************
 * CreaEnlacesDex: Obtiene la información esencial de las plantillas Cuadro Pokémon o
 * Cuadro Movimiento para generar una lista de enlaces a otras Pokédex. Guarda en una cookie
 * la información para poder generar la información al editar una sección cualquiera o previsualizar
 *
 * Copyright (C) 2007 - 2011 Jesús Martínez Novo ([[User:Ciencia Al Poder]])
 * This program is free software; you can redistribute it and/or modify
 *   it under the terms of the GNU General Public License as published by
 *   the Free Software Foundation; either version 2 of the License, or
 *   (at your option) any later version
 */
(function(){

var T_POKEMON = 'p',
	T_MOVIMIENTO = 'm',
	// Frameworks y funciones externas
	$UT = UtilityTools,
	$G = UtilityTools.get;

// Constantes
var T_EN = ' (en inglés)',
	T_G = ' Generación',
	T_UBP = 'http://bulbapedia.bulbagarden.net/wiki/',
	T_UPS = 'http://pokemon-stats.com/pokemon/fichas_',
	T_UGN = 'http://www.guiasnintendo.com/',
	T_UGN3 = T_UGN+'3_GB_GameBoy/',
	T_UGN1 = T_UGN+'1_GAMEBOY_ADVANCE/',
	T_USP = 'http://www.serebii.net/pokedex',
	T_USA = 'http://www.serebii.net/attackdex',
	T_ULP = 'http://www.legendarypokemon.net/',
	T_GN = 'Guías Nintendo',
	T_PS = 'Pokémon-stats',
	T_S = 'Serebii',
	T_L = 'Legendary',
	T_LP = 'Legendary Pokémon: ';
	
CreaEnlacesDex = function(){
	this.vars = {
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
	};
	this.generaciones = ['Primera', 'Segunda', 'Tercera', 'Cuarta', 'Quinta'];
	this.cookieTag = 'DexItem';
	this.init();
};

CreaEnlacesDex.prototype = {
	// Inicio
	init: function(){
		if(this.getFromPage()||this.getFromCookie()) {
			this.saveOnExit();
			if (this.vars.tipo === T_POKEMON) this.genPoke();
			if (this.vars.tipo === T_MOVIMIENTO) this.genMov();
			this.setToCookie();
		}
	},
	// Obtener guardado de cookie
	// formato: "tipo:p|nombre:asdf|num:000|hoenn:000"
	getFromCookie: function(){
		var cookieStr = $UT.cookie(this.cookieTag);
		if (cookieStr === null) {
			return false;
		}
		var p = cookieStr.split('|');
		for (var i = 0; i < p.length; i++){
			var ar = p[i].split(':');
			if (ar.length < 2) continue;
			this.vars[ar[0]] = ar[1];
		}
		if (this.vars.nombreArt === null || this.vars.nombre === null) {
			return false;
		}
		return (this.vars.nombreArt===window.wgPageName);
	},
	// Obtener de la página
	getFromPage: function(){
		this.vars.nombreArt = window.wgPageName;
		if( $G('nombrepokemon') && $G('numeronacional') ) {
			this.vars.tipo = T_POKEMON;
			this.vars.nombre = $UT.trim($UT.getInnerText($G('nombrepokemon')));
			var n = parseInt( $UT.trim($UT.getInnerText($G('numeronacional'))), 10);
			if(!isNaN(n) && n > 0) { this.vars.num=n; }
			else { this.vars.num = 0; }
			if ( $G('numerohoenn')) {
				n = parseInt( $UT.trim($UT.getInnerText($G('numerohoenn'))), 10);
				if(!isNaN(n) && n > 0) { this.vars.hoenn = n; }
				else { this.vars.hoenn = 0; }
			}
			return true;
		} else if( $G('nombremovimiento')) {
			this.vars.tipo = T_MOVIMIENTO;
			this.vars.nombre = $UT.trim($UT.getInnerText($G('nombremovimiento')));
			var em = $G('nombreingles');
			this.vars.ingles = $UT.trim($UT.getInnerText(em));
			var tr = em.parentNode.parentNode.parentNode.rows[2];
			var gentxt = '';
			if ($UT.trim($UT.getInnerText(tr.cells[0])).indexOf('Generación') != -1) {
				gentxt = $UT.trim($UT.getInnerText(tr.cells[1]));
			}
			for (var i=0; i < this.generaciones.length; i++) {
				if (this.generaciones[i] === gentxt) {
					this.vars.generacion = i+1;
					break;
				}
			}
			return true;
		}
		return false;
	},
	// Setea al salir
	saveOnExit: function(){
		$UT.addHandler(window,'unload', function(thisArg){
			return function(){
				thisArg.setToCookie();
			};
		}(this));
	},
	// Setea en cookie
	setToCookie: function(){
		var sz='';
		for (var elem in this.vars) {
			if (this.vars[elem] !== null) {
				sz += '|'+elem+':'+this.vars[elem];
			}
		}
		$UT.cookie(this.cookieTag,sz.replace('|', ''));
	},
	genPoke: function(){
		var m = this.vars.nombre,
			n = this.vars.num,
			sn = n.toString(),
			h = 0,
			zPadLeft = function(item, num){
				var szRet='';
				for (var i = item.length; i < num; i++) {
					szRet += '0';
				}
				return szRet+item;
			};
		if (this.vars.hoenn !== null && !isNaN(parseInt(this.vars.hoenn,10))) {
			h = parseInt(this.vars.hoenn,10);
		}
		this.link('http://es.wikipedia.org/wiki/'+m,'Wikipedia','Wikipedia en español');
		// Guias nintendo
		n && n<=150 && this.link(T_UGN3+'pokemon/pokemon_sp/Pokedex/'+m.toLowerCase().replace('mr. ','')+'.asp',T_GN+' RAA',T_GN+': 1ª'+T_G);
		n && n<=251 && this.link(T_UGN3+'pokeoroplata/Pokedex/'+zPadLeft(sn,2)+'-'+m.replace(' ','')+'.htm',T_GN+' OPC',T_GN+': 2ª'+T_G);
		h && h<=200 && this.link(T_UGN1+'pokemonrubizafiro/pok_rubi_zafiro_SP/pokedex/pokemon'+zPadLeft(h.toString(),3)+m.toLowerCase()+'.htm',T_GN+' RZ',T_GN+': Pokémon ediciones Rubí y Zafiro');
		h && h<=202 && this.link(T_UGN1+'Pokemon_Esmeralda/pok_esmeralda_SP/pokedex/pokemon'+zPadLeft(h.toString(),3)+m.toLowerCase()+'.html',T_GN+' E(H)',T_GN+': Pokémon edición Esmeralda, Pokédex de Hoenn');
		n && n<=386 && this.link(T_UGN1+'Pokemon_Esmeralda/pok_esmeralda_SP/pokedex_nacional/'+zPadLeft(sn,3)+'.html',T_GN+' E(N)',T_GN+': Pokémon edición Esmeralda, Pokédex Nacional');
		n && n<=386 && this.link(T_UGN1+'pokemon_rojofuego_verdehoja/pokemon_rojofuego_verdehoja_sp/pokedex/'+zPadLeft(sn,3)+'.html',T_GN+' RfVh',T_GN+': Pokémon ediciones Rojo Fuego y Verde Hoja');
		n && n<=490 && this.link(T_UGN+'0_NINTENDO_DS/Pokemon_perla_diamante/Pokemon_perla_diamante_sp/pokedex_nacional/'+zPadLeft(sn,3)+'.html',T_GN+' DP',T_GN+': 4ª'+T_G);
		// pokemon-stats
		if (n && n <= 151){
			this.link(T_UPS+'ra/'+zPadLeft(sn,3)+'.php', T_PS+' RA',T_PS+': Rojo y Azul');
			this.link(T_UPS+'amarillo/'+zPadLeft(sn,3)+'.php', T_PS+' A',T_PS+': Amarillo');
		}
		if (n && n <= 251){
			this.link(T_UPS+'op/'+zPadLeft(sn,3)+'.php',T_PS+' OP',T_PS+': Oro y Plata');
			this.link(T_UPS+'cristal/'+zPadLeft(sn,3)+'.php',T_PS+' C',T_PS+': Cristal');
		}
		if (h && h <= 386){
			this.link(T_UPS+'rz/'+zPadLeft(h.toString(),3)+'.php', T_PS+' RZ',T_PS+': Rubí y Zafiro');
			this.link(T_UPS+'esmeralda/'+zPadLeft(h.toString(),3)+'.php',T_PS+' E',T_PS+': Esmeralda');
		}
		n && n <= 386 && this.link(T_UPS+'rfvh/'+zPadLeft(sn,3)+'.php',T_PS+' RV',T_PS+': Rojo Fuego y Verde Hoja');
		n && n <= 493 && this.link(T_UPS+'dp/'+zPadLeft(sn,3)+'.php',T_PS+' DP',T_PS+': Diamante y Perla');
		// Pokexperto
		n && this.link('http://www.pokexperto.net/index2.php?seccion=nds/nationaldex/pkmn&pk='+sn,'Pokexperto 3-5Gen','Pokexperto: 3ª a 5ª'+T_G);
		// Otras/otros idiomas
		this.link('http://en.wikipedia.org/wiki/'+m,'Wikipedia [en]','Wikipedia'+T_EN);
		this.link('http://pokemon.wikia.com/wiki/'+m,'TPE [en]','The Pokemon Encyclopedia'+T_EN);
		this.link(T_UBP+m+'_(Pokémon)', 'Bulbapedia [en]','Bulbapedia'+T_EN);
		this.link('http://veekun.com/dex/pokemon/'+m.toLowerCase(),'Veekun [en]','Veekun'+T_EN);
		n && n <= 386 && this.link(T_ULP+'rs/pokedex/'+m,T_L+' 3Gen [en]',T_LP+'3ª'+T_G+T_EN);
		n && n <= 493 && this.link(T_ULP+'dp/pokedex/'+m,T_L+' 4Gen [en]',T_LP+'4ª'+T_G+T_EN);
		n && n <= 251 && this.link(T_USP+'/'+zPadLeft(sn,3)+'.shtml',T_S+' 1-2Gen [en]',T_S+': 1ª y 2ª'+T_G+T_EN);
		n && n <= 386 && this.link(T_USP+'-rs/'+zPadLeft(sn,3)+'.shtml',T_S+' 3Gen [en]',T_S+': 3ª'+T_G+T_EN);
		n && n <= 493 && this.link(T_USP+'-dp/'+zPadLeft(sn,3)+'.shtml',T_S+' 4Gen [en]',T_S+': 4ª'+T_G+T_EN);
		n && n <= 649 && this.link(T_USP+'-bw/'+zPadLeft(sn,3)+'.shtml',T_S+' 5Gen [en]',T_S+': 5ª'+T_G+T_EN);
	},
	genMov: function(){
		var m = this.vars.nombre,
			i = (this.vars.ingles || 0),
			g = (parseInt(this.vars.generacion,10) || 1);
		i && g <= 5 && this.link(T_UBP+i.replace(new RegExp('\\b(\\w)', 'g'), function(s,p){return p.toUpperCase();})+'_(move)','Bulbapedia [en]','Bulbapedia'+T_EN);
		i && g <= 5 && this.link('http://veekun.com/dex/moves/'+i.toLowerCase(),'Veekun [en]','Veekun'+T_EN);
		i && g <= 3 && this.link(T_ULP+'rs/attacks/'+i,T_L+' 3Gen [en]',T_LP+'3ª'+T_G+T_EN);
		i && g <= 4 && this.link(T_ULP+'dp/attacks/'+i,T_L+' 4Gen [en]',T_LP+'4ª'+T_G+T_EN);
		i && g <= 3 && this.link(T_USA+'/'+i.toLowerCase().replace(new RegExp('\\s', 'g'),'')+'.shtml',T_S+' 3Gen [en]',T_S+': 3ª'+T_G+T_EN);
		i && g <= 4 && this.link(T_USA+'-dp/'+i.toLowerCase().replace(new RegExp('\\s', 'g'),'')+'.shtml',T_S+' 4Gen [en]',T_S+': 4ª'+T_G+T_EN);
		i && g <= 5 && this.link(T_USA+'-bw/'+i.toLowerCase().replace(new RegExp('\\s', 'g'),'')+'.shtml',T_S+' 5Gen [en]',T_S+': 5ª'+T_G+T_EN);
		i && g <= 4 && this.link('http://www.smogon.com/dp/moves/'+i.toLowerCase().replace(new RegExp('\\s', 'g'),'_'),'Smogon 4Gen [en]','Smogon: 4ª'+T_G+T_EN);
	},
	link:function(url, text, caption){/*override*/}
};
})();
// </pre>
