// <pre>
/* A JavaScript implementation of the SHA family of hashes, as defined in FIPS
 * PUB 180-2 as well as the corresponding HMAC implementation as defined in
 * FIPS PUB 198a
 *
 * Version 1.3 Copyright Brian Turek 2008-2010
 * Distributed under the BSD License
 * See http://jssha.sourceforge.net/ for more information
 *
 * Several functions taken from Paul Johnson
 */
(function(){var charSize=8,b64pad="",hexCase=0,str2binb=function(a){var b=[],mask=(1<<charSize)-1,length=a.length*charSize,i;for(i=0;i<length;i+=charSize){b[i>>5]|=(a.charCodeAt(i/charSize)&mask)<<(32-charSize-(i%32))}return b},hex2binb=function(a){var b=[],length=a.length,i,num;for(i=0;i<length;i+=2){num=parseInt(a.substr(i,2),16);if(!isNaN(num)){b[i>>3]|=num<<(24-(4*(i%8)))}else{return"INVALID HEX STRING"}}return b},binb2hex=function(a){var b=(hexCase)?"0123456789ABCDEF":"0123456789abcdef",str="",length=a.length*4,i,srcByte;for(i=0;i<length;i+=1){srcByte=a[i>>2]>>((3-(i%4))*8);str+=b.charAt((srcByte>>4)&0xF)+b.charAt(srcByte&0xF)}return str},binb2b64=function(a){var b="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"+"0123456789+/",str="",length=a.length*4,i,j,triplet;for(i=0;i<length;i+=3){triplet=(((a[i>>2]>>8*(3-i%4))&0xFF)<<16)|(((a[i+1>>2]>>8*(3-(i+1)%4))&0xFF)<<8)|((a[i+2>>2]>>8*(3-(i+2)%4))&0xFF);for(j=0;j<4;j+=1){if(i*8+j*6<=a.length*32){str+=b.charAt((triplet>>6*(3-j))&0x3F)}else{str+=b64pad}}}return str},rotl=function(x,n){return(x<<n)|(x>>>(32-n))},parity=function(x,y,z){return x^y^z},ch=function(x,y,z){return(x&y)^(~x&z)},maj=function(x,y,z){return(x&y)^(x&z)^(y&z)},safeAdd_2=function(x,y){var a=(x&0xFFFF)+(y&0xFFFF),msw=(x>>>16)+(y>>>16)+(a>>>16);return((msw&0xFFFF)<<16)|(a&0xFFFF)},safeAdd_5=function(a,b,c,d,e){var f=(a&0xFFFF)+(b&0xFFFF)+(c&0xFFFF)+(d&0xFFFF)+(e&0xFFFF),msw=(a>>>16)+(b>>>16)+(c>>>16)+(d>>>16)+(e>>>16)+(f>>>16);return((msw&0xFFFF)<<16)|(f&0xFFFF)},coreSHA1=function(f,g){var W=[],a,b,c,d,e,T,i,t,appendedMessageLength,H=[0x67452301,0xefcdab89,0x98badcfe,0x10325476,0xc3d2e1f0],K=[0x5a827999,0x5a827999,0x5a827999,0x5a827999,0x5a827999,0x5a827999,0x5a827999,0x5a827999,0x5a827999,0x5a827999,0x5a827999,0x5a827999,0x5a827999,0x5a827999,0x5a827999,0x5a827999,0x5a827999,0x5a827999,0x5a827999,0x5a827999,0x6ed9eba1,0x6ed9eba1,0x6ed9eba1,0x6ed9eba1,0x6ed9eba1,0x6ed9eba1,0x6ed9eba1,0x6ed9eba1,0x6ed9eba1,0x6ed9eba1,0x6ed9eba1,0x6ed9eba1,0x6ed9eba1,0x6ed9eba1,0x6ed9eba1,0x6ed9eba1,0x6ed9eba1,0x6ed9eba1,0x6ed9eba1,0x6ed9eba1,0x8f1bbcdc,0x8f1bbcdc,0x8f1bbcdc,0x8f1bbcdc,0x8f1bbcdc,0x8f1bbcdc,0x8f1bbcdc,0x8f1bbcdc,0x8f1bbcdc,0x8f1bbcdc,0x8f1bbcdc,0x8f1bbcdc,0x8f1bbcdc,0x8f1bbcdc,0x8f1bbcdc,0x8f1bbcdc,0x8f1bbcdc,0x8f1bbcdc,0x8f1bbcdc,0x8f1bbcdc,0xca62c1d6,0xca62c1d6,0xca62c1d6,0xca62c1d6,0xca62c1d6,0xca62c1d6,0xca62c1d6,0xca62c1d6,0xca62c1d6,0xca62c1d6,0xca62c1d6,0xca62c1d6,0xca62c1d6,0xca62c1d6,0xca62c1d6,0xca62c1d6,0xca62c1d6,0xca62c1d6,0xca62c1d6,0xca62c1d6];f[g>>5]|=0x80<<(24-(g%32));f[(((g+65)>>9)<<4)+15]=g;appendedMessageLength=f.length;for(i=0;i<appendedMessageLength;i+=16){a=H[0];b=H[1];c=H[2];d=H[3];e=H[4];for(t=0;t<80;t+=1){if(t<16){W[t]=f[t+i]}else{W[t]=rotl(W[t-3]^W[t-8]^W[t-14]^W[t-16],1)}if(t<20){T=safeAdd_5(rotl(a,5),ch(b,c,d),e,K[t],W[t])}else if(t<40){T=safeAdd_5(rotl(a,5),parity(b,c,d),e,K[t],W[t])}else if(t<60){T=safeAdd_5(rotl(a,5),maj(b,c,d),e,K[t],W[t])}else{T=safeAdd_5(rotl(a,5),parity(b,c,d),e,K[t],W[t])}e=d;d=c;c=rotl(b,30);b=a;a=T}H[0]=safeAdd_2(a,H[0]);H[1]=safeAdd_2(b,H[1]);H[2]=safeAdd_2(c,H[2]);H[3]=safeAdd_2(d,H[3]);H[4]=safeAdd_2(e,H[4])}return H},jsSHA=function(a,b){this.sha1=null;this.strBinLen=null;this.strToHash=null;if("HEX"===b){if(0!==(a.length%2)){return"TEXT MUST BE IN BYTE INCREMENTS"}this.strBinLen=a.length*4;this.strToHash=hex2binb(a)}else if(("ASCII"===b)||('undefined'===typeof(b))){this.strBinLen=a.length*charSize;this.strToHash=str2binb(a)}else{return"UNKNOWN TEXT INPUT TYPE"}};jsSHA.prototype={getHash:function(a){var b=null,message=this.strToHash.slice();switch(a){case"HEX":b=binb2hex;break;case"B64":b=binb2b64;break;default:return"FORMAT NOT RECOGNIZED"}if(null===this.sha1){this.sha1=coreSHA1(message,this.strBinLen)}return b(this.sha1)},getHMAC:function(a,b,c){var d,keyToUse,i,retVal,keyBinLen,keyWithIPad=[],keyWithOPad=[];switch(c){case"HEX":d=binb2hex;break;case"B64":d=binb2b64;break;default:return"FORMAT NOT RECOGNIZED"}if("HEX"===b){if(0!==(a.length%2)){return"KEY MUST BE IN BYTE INCREMENTS"}keyToUse=hex2binb(a);keyBinLen=a.length*4}else if("ASCII"===b){keyToUse=str2binb(a);keyBinLen=a.length*charSize}else{return"UNKNOWN KEY INPUT TYPE"}if(64<(keyBinLen/8)){keyToUse=coreSHA1(keyToUse,keyBinLen);keyToUse[15]&=0xFFFFFF00}else if(64>(keyBinLen/8)){keyToUse[15]&=0xFFFFFF00}for(i=0;i<=15;i+=1){keyWithIPad[i]=keyToUse[i]^0x36363636;keyWithOPad[i]=keyToUse[i]^0x5C5C5C5C}retVal=coreSHA1(keyWithIPad.concat(this.strToHash),512+this.strBinLen);retVal=coreSHA1(keyWithOPad.concat(retVal),672);return(d(retVal))}};window.jsSHA=jsSHA}());

/*
 * UserWikiInfo v3.6: Una colección de enlaces útiles relacionados con el usuario que aparece en contribuciones, página de usuario y discusión, con recuento de ediciones y avatar, para Monobook
 *
 * Copyright (C) 2010-2012  Jesús Martínez Novo ([[User:Ciencia Al Poder]])
 *
 * This program is free software; you can redistribute it and/or modify
 *   it under the terms of the GNU General Public License as published by
 *   the Free Software Foundation; either version 2 of the License, or
 *   (at your option) any later version
 *
 * @requires: mediawiki.api, jquery.ui.dialog, jquery.form
*/
(function($) {
	'use strict';

	var _tmpl = '<div class="useravatar"><a title="Avatar de {U}"><img src="http://images4.wikia.nocookie.net/__cb20081128203240/messaging/images/thumb/1/19/Avatar.jpg/50px-Avatar.jpg" width="100" height="100" alt="Avatar" /></a></div>' +
		'<span class="userlink"><a title="Página de usuario">Usuario:{U}</a></span> &#124; <span class="talklink"><a title="Página de discusión">Discusión</a> <a href="/index.php?title=Usuario_Discusión:{u}&amp;action=edit&amp;section=new" title="Dejar un nuevo mensaje en la página de discusión">[+]</a></span>{email} &#124; <span class="contribslink"><a title="Contribuciones de usuario">Contribuciones</a></span>{group}'+
		'<div class="contribdetails"></div>',
	_emailtmpl = ' &#124; <span class="emaillink"><a href="/wiki/Especial:MandarEmailUsuario/{u}" title="Enviar correo electrónico a usuario">Enviar correo</a></span>',
	_contrtmpl = '{U} ha realizado {c} ediciones desde el {fe}<br /><span class="contenteditcount"><a href="/wiki/Especial:Editcount/{U}" title="{cu} ediciones (el {r}% del total) se han hecho en artículos, categorías, imágenes y plantillas. Ver estadísticas avanzadas."><span class="psmax"><span class="psact pslvl{l}" style="width:{r}%;"></span></span></a></span>',
	_grouptmpl = ' &#124; <span class="usergroups" title="Grupos a los que pertenece el usuario">Grupos: {g}</span>',
	_nosuchuser = 'El usuario no existe',
	_editavatar = 'Cambiar avatar',
	_editavatardescription = 'Selecciona una imagen desde tu PC para utilizar como tu avatar. Debería tener forma cuadrada (misma altura que anchura). Si la imagen es alargada se recortará, por lo que puede quedar deformada. Es recomendable que la edites primero en un programa de edición de imágenes para que tenga estas dimensiones. El tamaño óptimo es 150x150px.',
	_previewsaveavatar = 'Esta es la imagen que has subido y que se usará como avatar. Si estás de acuerdo, confirma el cambio. Ten en cuenta que podría seguir mostrándose el anterior por un tiempo debido a que tu navegador ha guardado la versión antigua. Si al aceptar ves la imagen que acabas de subir es que todo ha ido bien.',
	_saveavatar = 'Aplicar el nuevo avatar',
	_datefm = '{d} de {m} de {y}',
	_months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
	_groupseparator = ', ',
	_groups = {
		bureaucrat: '<a href="/wiki/WikiDex:Administradores">burócrata</a>',
		sysop: '<a href="/wiki/WikiDex:Administradores">administrador</a>',
		rollback: '<a href="/wiki/WikiDex:Reversores">reversor</a>',
		asistente: '<a href="/wiki/WikiDex:Asistentes">asistente</a>',
		bot: '<a href="/wiki/WikiDex:Bots">bot</a>',
		'fb-user': false,
		'*': false,
		user: false,
		autoconfirmed: false,
		emailconfirmed: false
	},
	_avatarWidth = 100, // Initial width
	_avatarHeight = 100, // Max height
	_avatarImg = null,
	_isIP = false,
	_userid = null,
	_username = null,
	_firstEditDate = null,
	_dlg = null,
	_fetchinginfo = false,
	_formdata = null,
	_init = function() {
		var u = null, qParams = {action:'query', list:'users|usercontribs', usprop: 'groups|editcount|registration|emailable', uclimit:'1', ucdir:'newer', ucprop:'timestamp', smaxage:'3600', maxage: '3600'}, api = new mw.Api();
		if (mw.config.get('wgNamespaceNumber', 0) === -1 && mw.config.get('wgCanonicalSpecialPageName', '') === 'Contributions') {
			var cbu = $('#user');
			if (cbu.length === 1 && cbu.get(0).checked) {
				u = cbu.parent().children('input[name=target]').eq(0).val();
			}
		} else if (mw.config.get('wgCanonicalNamespace', '') === 'User' || mw.config.get('wgCanonicalNamespace', '') === 'User_talk' || mw.config.get('wgCanonicalNamespace', '') === 'Usuario_Blog') {
			u = mw.config.get('wgTitle', '');
			var sl = u.indexOf('/');
			if (sl !== -1) {
				u = u.substr(0, sl);
			}
		}
		if (!u) return;
		qParams.ususers = qParams.ucuser = u;
		if (u.search(new RegExp('^\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}$')) !== -1) {
			_isIP = true;
		}
		$('#bodyContent').prepend('<div id="UserWikiInfo"></div>');
		api.get(qParams, {ok: _dataRecv});
	},
	_dataRecv = function(data) {
		var q = data.query, exists = true, uwi = $('#UserWikiInfo');
		if (typeof q.users[0].missing !== 'undefined') exists = false;
		var u = q.users[0].name, editcount = (q.users[0].editcount||0), groups = q.users[0].groups, emailable = (typeof q.users[0].emailable === 'string'), firstedit = (q.usercontribs.length === 0 ? '' : q.usercontribs[0].timestamp), userid = -1, grouptext = '', userlinktext = '', api = new mw.Api();
		if (!_isIP && exists) {
			//userid = q.allusers[0].id.toString();
			userid = q.users[0].userid.toString();
		}
		u.replace(new RegExp('\<', 'g'), '&lt;').replace(new RegExp('\>', 'g'), '&gt;').replace(new RegExp('"', 'g'), '&quot;');
		if (firstedit !== '') {
			_firstEditDate = new Date(Date.UTC(firstedit.substr(0,4), parseInt(firstedit.substr(5,2),10)-1, firstedit.substr(8,2)));
		} else {
			_firstEditDate = new Date();
		}
		if (groups && groups.length > 0) {
			var g = '';
			for (var i = 0; i < groups.length; i++) {
				if (_groups[groups[i]] === false) {
					continue;
				}
				if (g.length) {
					g += _groupseparator;
				}
				g += (_groups[groups[i]] || groups[i]);
			}
			if (g.length) {
				grouptext = _grouptmpl.replace(new RegExp('\\{g\\}', 'g'), g);
			}
		}
		uwi.append(
			_tmpl.replace(
				'{email}', (emailable ? _emailtmpl : '')).replace(
				new RegExp('\\{U\\}', 'g'), u).replace(
				new RegExp('\\{u\\}', 'g'), mw.util.wikiUrlencode(u)).replace(
				'{group}', grouptext));
		uwi.find('.useravatar').children('a').eq(0).attr('href', mw.util.wikiGetlink(((_isIP ? (mw.config.get('wgFormattedNamespaces')['-1'] + ':Contributions/') : (mw.config.get('wgFormattedNamespaces')['2'] + ':')) + u)));
		if (!_isIP) {
			uwi.find('.userlink').children('a').eq(0).attr('href', mw.util.wikiGetlink(mw.config.get('wgFormattedNamespaces')['2'] + ':' + u));
		}
		uwi.find('.talklink').children('a').eq(0).attr('href', mw.util.wikiGetlink(mw.config.get('wgFormattedNamespaces')['3'] + ':' + u));
		uwi.find('.contribslink').children('a').eq(0).attr('href', mw.util.wikiGetlink(mw.config.get('wgFormattedNamespaces')['-1'] + ':Contributions/' + u));
		if (!exists) {
			uwi.children('.contribdetails').eq(0).text(_nosuchuser);
		}
		// Avatar
		if (!_isIP) {
			if (mw.config.get('wgUserName', '') === u) {
				$('<a class="editavatar" href="#"></a>').text(_editavatar).appendTo($('#UserWikiInfo').find('.useravatar').eq(0)).bind('click', function() {
					//$.loadJQueryAIM(_changeAvatar);
					mw.loader.using(['jquery.ui.dialog', 'jquery.form', 'jquery.json'], _changeAvatar);
					return false;
				});
			}
			var img = new Image();
			_avatarImg = img;
			img.onload = _avatarLoaded;
			var avatar = userid+'.png';
			var hash = (new jsSHA(userid, 'ASCII')).getHash('HEX');
			img.alt = 'avatar';
			img.src = 'http://images1.wikia.nocookie.net/common/avatars/thumb/'+hash.substr(0,1)+'/'+hash.substr(0,2)+'/'+avatar+'/'+_avatarWidth.toString()+'px-'+avatar;
		}
		// Contribs
		_username = u;
		_userid = userid;
		//if (editcount > 0) -- En wikia puede salir editcount a 0 aun habiendo editado
		var params = {
			action: 'parse',
			text: '{{:MediaWiki:UserWikiInfoContribs}}',
			title: 'User:'+u,
			prop: 'text',
			disablepp: '',
			smaxage: '3600',
			maxage: '3600'
		};
		api.get(params, {ok: _contribsData});
	},
	_avatarLoaded = function() {
		var img = _avatarImg, h = img.height, w = img.width;
		if (h < 1) return;
		if (h > _avatarHeight) {
			img.style.height = _avatarHeight+'px';
		}
		$('#UserWikiInfo').children('.useravatar').eq(0).find('img').eq(0).replaceWith(img);
	},
	_contribsData = function(data) {
		var text = data.parse.text['*'], c = 0, cu = 0, acontr = [], rate = 0, lvl = 0, d = _firstEditDate, fe = '', n;
		if (text.indexOf('class="new"') !== -1 || text.indexOf('<p>') === -1) return; // Template does not exist/sanity check
		text = text.substring(3, text.indexOf('</p>')).replace(new RegExp('[\.,]', 'g'), '');
		// Sum of each number, separated by pipes
		acontr = text.split('|');
		for (var i = 0; i < acontr.length; i++) {
			n = parseInt(acontr[i], 10);
			if (isNaN(n)) return;
			if (i === 0) {
				c = n;
			} else {
				cu += n;
			}
		}
		if (c !== 0) {
			// Multiply by 100, convert to int and divide by 100 to round to 2 decimal positions. Multiply by 100 again because it's a %
			rate = parseInt((cu*10000/c), 10)/100;
			// Level: a integer between 0 and 4 proportional to rate, to allow specific styles applied
			lvl = parseInt((cu/c*4), 10);
			// Sometimes the sum is greater than 100 (wrong cached data?). Correct it
			if (rate > 100) {
				rate = 100;
				lvl = 4;
			}
		}
		fe = _datefm.replace('{d}', d.getDate()).replace('{m}', _months[d.getMonth()]).replace('{y}', d.getFullYear());
		$('#UserWikiInfo').children('.contribdetails').eq(0).append(
			_contrtmpl.replace(new RegExp('\\{U\\}', 'g'), _username).replace(
				new RegExp('\\{c\\}', 'g'), c).replace(
				new RegExp('\\{cu\\}', 'g'), cu).replace(
				new RegExp('\\{l\\}', 'g'), lvl).replace(
				new RegExp('\\{r\\}', 'g'), rate).replace(
				new RegExp('\\{fe\\}', 'g'), fe));
	},
	// Método para mostrar el form de cambio de avatar. Si el argumento es string es por algun error
	_changeAvatar = function(o) {
		var bFirstDialog = false;
		if (!_dlg) {
			bFirstDialog = true;
			_dlg = $('<div id="UserWikiInfoUploadAvatar"></div>');
		} else {
			_dlg.find('input').unbind().end().html('');
		}
		if (typeof o === 'string') {
			$('<div class="error"></div>').text(o).appendTo(_dlg);
		}
		$('<p></p>').text(_editavatardescription).appendTo(_dlg);
		_dlg.append(
			'<form action="/wikia.php?controller=UserProfilePage&method=onSubmitUsersAvatar&format=json&userId='+_userid+'" method="post" enctype="multipart/form-data">' +
			'<input type="file" name="UPPLightboxAvatar"/></form>').find('input[type="file"]').bind('change', _uploadAvatar);
		if (bFirstDialog) {
			_dlg.dialog({
				modal: true,
				title: _editavatar,
				width: 500
			});
		} else {
			_dlg.dialog('option', {height: 'auto'}).dialog('open');
		}
		// Fetch the rest of user data
		if (!_fetchinginfo && _formdata === null) {
			$.post('/wikia.php?controller=UserProfilePage&format=json', {method: 'getLightboxData', tab: 'about', userId: _userid, rand: Math.floor(Math.random()*100001)}, _fetchResult, 'json');
		}
	},
	_fetchResult = function(data) {
		if (data.body) {
			_formdata = {};
			$(data.body).find('#userData').find('input,select').each(function() {
				_formdata[this.name] = this.value;
			});
		}
		_fetchinginfo = false;
	},
	_uploadAvatar = function() {
		_dlg.find('form').eq(0).find('input').css('visibility', 'hidden').after('<span class="mw-small-spinner"></span>').end().ajaxSubmit({
			dataType: 'json',
			success: function(data) {
				try {
					if(data.result.success === true) {
						_dlg.find('input').unbind().end().html(
							'<div style="float:left; margin-right: 10px;"><img class="useravatar" src="'+data.result.avatar+'" /></div>').append(
							$('<p></p>').text(_previewsaveavatar)).append(
							'<p><input type="button" name="save" /></p>').find(
							'input[name="save"]').val(_saveavatar).bind('click', _submitChanges);
						_dlg.dialog('option', {height: 'auto'}).dialog('open');
					} else {
						_changeAvatar(data.result.error);
					}
				} catch(e) {
					_changeAvatar(e.message);
				}
			},
			error: function(xhr, status, errMsg) {
				var msg = (status || '');
				if (msg.length) {
					msg += ': ' + errMsg;
				} else {
					msg = errMsg;
				}
			}
		})
	},
	_submitChanges = function() {
		_dlg.find('input').unbind().attr('disabled', 'disabled');
		if (_formdata === null) {
			_changeAvatar('Error: formdata null');
		}
		_formdata.avatarData = {'file': _dlg.find('img.useravatar').attr('src'), 'source': 'uploaded', 'userId': _userid};
		$.ajax({
			type: 'POST',
			url: '/wikia.php?controller=UserProfilePage&format=json&method=saveUserData',
			dataType: 'json',
			data: 'userId=' + _userid + '&data=' + $.toJSON( _formdata ),
			success: _submitComplete,
			error: function(xhr, t, e) {
				if (t === null && e !== undefined) {
					t = e.toString() + e.stack;
				}
				_changeAvatar(t);
			}
		});
	},
	_submitComplete = function(data) {
		if (data.status === 'error') {
			_changeAvatar(data.errorMsg);
		} else {
			var img = $('#UserWikiInfo').find('.useravatar').find('img');
			var src = img.attr('src');
			if (src.indexOf('?') === -1) {
				src += '?';
			}
			src += (new Date()).getMilliseconds().toString();
			img.unbind('load').get(0).onload = null;
			img.attr('src', src);
			_dlg.dialog('close');
		}
	};

	$(_init);

})(jQuery);
// </pre>
