// <pre>
/*
 * UserWikiInfo v4.0: Una colección de enlaces útiles relacionados con el usuario que aparece en contribuciones, página de usuario y discusión, con recuento de ediciones y avatar, para Monobook
 *
 * Copyright (C) 2010-2016  Jesús Martínez Novo ([[User:Ciencia Al Poder]])
 *
 * This program is free software; you can redistribute it and/or modify
 *   it under the terms of the GNU General Public License as published by
 *   the Free Software Foundation; either version 2 of the License, or
 *   (at your option) any later version
 *
 * @requires: mediawiki.api, jquery.ui.dialog, jquery.form
*/
(function($, mw) {
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
		emailconfirmed: false,
		poweruser: false
	},
	//_avatarWidth = 100, // Initial width
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
		var u = null, qParams, api, cbu, sl;
		qParams = {action:'query', list:'users|usercontribs', usprop: 'groups|editcount|registration|emailable', uclimit:'1', ucdir:'newer', ucprop:'timestamp', smaxage:'3600', maxage: '3600'};
		api = new mw.Api();
		if (mw.config.get('wgNamespaceNumber', 0) === -1 && mw.config.get('wgCanonicalSpecialPageName', '') === 'Contributions') {
			cbu = $('#user');
			if (cbu.length === 1 && cbu.get(0).checked) {
				u = cbu.parent().children('input[name=target]').eq(0).val();
			}
		} else if (mw.config.get('wgCanonicalNamespace', '') === 'User' || mw.config.get('wgCanonicalNamespace', '') === 'User_talk' || mw.config.get('wgCanonicalNamespace', '') === 'Usuario_Blog') {
			u = mw.config.get('wgTitle', '');
			sl = u.indexOf('/');
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
		api.get(qParams).done(_dataRecv);
	},
	_dataRecv = function(data) {
		var q = data.query, exists = true, $uwi = $('#UserWikiInfo'), u, groups, emailable, firstedit, userid, g, grouptext, api, params;
		if (typeof q.users[0].missing !== 'undefined') {
			exists = false;
		}
		u = q.users[0].name;
		groups = q.users[0].groups;
		emailable = (typeof q.users[0].emailable === 'string');
		firstedit = (q.usercontribs.length === 0 ? '' : q.usercontribs[0].timestamp);
		userid = -1;
		grouptext = '';
		api = new mw.Api();
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
			g = '';
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
		$uwi.append(
			_tmpl.replace(
				'{email}', (emailable ? _emailtmpl : '')).replace(
				new RegExp('\\{U\\}', 'g'), u).replace(
				new RegExp('\\{u\\}', 'g'), mw.util.wikiUrlencode(u)).replace(
				'{group}', grouptext));
		$uwi.find('.useravatar > a').eq(0).attr('href', mw.util.wikiGetlink(((_isIP ? (mw.config.get('wgFormattedNamespaces')['-1'] + ':Contributions/') : (mw.config.get('wgFormattedNamespaces')['2'] + ':')) + u)));
		if (!_isIP) {
			$uwi.find('.userlink > a').eq(0).attr('href', mw.util.wikiGetlink(mw.config.get('wgFormattedNamespaces')['2'] + ':' + u));
		}
		$uwi.find('.talklink > a').eq(0).attr('href', mw.util.wikiGetlink(mw.config.get('wgFormattedNamespaces')['3'] + ':' + u));
		$uwi.find('.contribslink > a').eq(0).attr('href', mw.util.wikiGetlink(mw.config.get('wgFormattedNamespaces')['-1'] + ':Contributions/' + u));
		if (!exists) {
			$uwi.children('.contribdetails').eq(0).text(_nosuchuser);
		}
		// Contribs
		_username = u;
		_userid = userid;
		// Avatar
		if (!_isIP) {
			$.getJSON('/api/v1/User/Details/', { ids: userid }).success(_wikiaMetadata);
		}
		//if ((q.users[0].editcount||0) > 0) -- En wikia puede salir editcount a 0 aun habiendo editado
		params = {
			action: 'parse',
			text: '{{:MediaWiki:UserWikiInfoContribs}}',
			title: 'User:'+u,
			prop: 'text',
			disablepp: '',
			smaxage: '3600',
			maxage: '3600'
		};
		api.get(params).done(_contribsData);
	},
	_wikiaMetadata = function(data) {
		var img;
		if (mw.config.get('wgUserName', '') === _username) {
			$('<a class="editavatar" href="#">').text(_editavatar).appendTo($('#UserWikiInfo').find('.useravatar').eq(0)).on('click', function() {
				mw.loader.using(['jquery.ui.dialog', 'jquery.form', 'jquery.json'], _changeAvatar);
				return false;
			});
		}
		if (data.items && data.items.length > 0) {
			img = new Image();
			_avatarImg = img;
			img.onload = _avatarLoaded;
			img.alt = 'avatar';
			img.src = data.items[0].avatar;
		}
	},
	_avatarLoaded = function() {
		var img = _avatarImg, h = img.height;
		if (h < 1) return;
		if (h > _avatarHeight) {
			img.style.height = _avatarHeight+'px';
		}
		$('#UserWikiInfo > .useravatar img').eq(0).replaceWith(img);
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
		$('#UserWikiInfo > .contribdetails').eq(0).append(
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
			_dlg = $('<div id="UserWikiInfoUploadAvatar">');
		} else {
			_dlg.find('input').off().end().html('');
		}
		if (typeof o === 'string') {
			$('<div class="error">').text(o).appendTo(_dlg);
		}
		$('<p>').text(_editavatardescription).appendTo(_dlg);
		_dlg.append(
			'<form action="/wikia.php?controller=UserProfilePage&method=onSubmitUsersAvatar&format=json&userId='+_userid+'" method="post" enctype="multipart/form-data">' +
			'<input type="file" name="UPPLightboxAvatar"/></form>').find('input[type="file"]').on('change', _uploadAvatar);
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
						_dlg.find('input').off().end().html(
							'<div style="float:left; margin-right: 10px;"><img class="useravatar" src="'+data.result.avatar+'" /></div>').append(
							$('<p>').text(_previewsaveavatar)).append(
							'<p><input type="button" name="save" /></p>').find(
							'input[name="save"]').val(_saveavatar).on('click', _submitChanges);
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
		});
	},
	_submitChanges = function() {
		_dlg.find('input').off().attr('disabled', 'disabled');
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
			img.off('load').get(0).onload = null;
			img.attr('src', src);
			_dlg.dialog('close');
		}
	};

	$(_init);

})(jQuery, mw);
// </pre>
