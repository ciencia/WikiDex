/** WikiaShoutBox v1.13: Conector para el Widget ShoutBox de Wikia
 * (C) 2011 Jesús Martínez Novo [[User:Ciencia_Al_Poder]]
 * This program is free software; you can redistribute it and/or modify
 *   it under the terms of the GNU General Public License as published by
 *   the Free Software Foundation; either version 2 of the License, or
 *   (at your option) any later version
 */
var WikiaShoutBox = {
	version: '1.13',
	cookietag: 'WSB',
	skin: 'oasis',
	wid: '302',
	contel: null,
	focus: false,
	init: function() {
		if (!window.wgUserName) return;
		var enabled = false;
		var expanded = false;
		var cfg = $.cookies.get(WikiaShoutBox.cookietag);
		if (cfg) {
			var cfgvars = cfg.split(':');
			enabled = (cfgvars.length >= 1 && cfgvars[0] == '1');
			expanded = (cfgvars.length >= 2 && cfgvars[1] == '1');
		}
		// Si alguien no le funciona, que pruebe a poner wgWidgetShoutBoxId = '1'; en su js
		if (typeof window.wgWidgetShoutBoxId == 'string' && !isNaN(window.wgWidgetShoutBoxId)) {
			WikiaShoutBox.wid = window.wgWidgetShoutBoxId;
		}
		WikiaShoutBox.render();
		if (enabled) {
			WikiaShoutBox.start();
			if (expanded) {
				WikiaShoutBox.expand();
			}
		}
		// Core functions
		window.WidgetShoutBoxSend = WikiaShoutBox.sendMsg;
		window.WidgetShoutBoxRemoveMsg = WikiaShoutBox.removeMsg;
	},
	render: function() {
		var fxBtn = function(type, title) {
			return '<a href="#" class="WidgetSprite '+type+'" title="'+title+'"><img src="'+window.wgBlankImgUrl+'" width="12" height="12"/></a>';
		};
		WikiaShoutBox.contel = $('<div id="p-sb" class="portlet"><h5>Chat '+fxBtn('start', 'Mostrar')+fxBtn('stop', 'Ocultar')+
			fxBtn('expand', 'Expandir')+fxBtn('collapse', 'Contraer')+fxBtn('edit', 'Configurar')+fxBtn('reload', 'Recargar')+'<span class="status"></span></h5><div class="pBody"></div></div>').insertAfter('#p-tb');
		$('#p-sb').children('h5').click(WikiaShoutBox.widgetBtnClick).children('a.WidgetSprite').not('a.start').css('display','none');
	},
	widgetBtnClick: function(e) {
		var tg = e.target;
		if (!tg) return;
		if (tg.tagName.toLowerCase() == 'img') tg = tg.parentNode;
		if (tg.tagName.toLowerCase() != 'a') return;
		var cn = tg.className.split(' ');
		for (var i = 0; i < cn.length; i++) {
			switch(cn[i]) {
				case 'start':
				case 'stop':
				case 'expand':
				case 'collapse':
				case 'edit':
				case 'reload':
					WikiaShoutBox[cn[i]]();
					return false;
					break;
			}
		}
	},
	widgetBtnVisible: function(cfg) {
		for (btn in cfg) {
			$('#p-sb').children('h5').children('a.'+btn).css('display',cfg[btn]?'':'none');
		}
	},
	start: function() {
		WikiaShoutBox.action('configure');
		$.cookies.set(WikiaShoutBox.cookietag, '1');
		WikiaShoutBox.widgetBtnVisible({start:false, stop:true, expand:true, edit:true, reload:true});
	},
	stop: function() {
		WikiaShoutBox.collapse();
		WikiaShoutBox.widgetBtnVisible({start:true, stop:false, expand:false, collapse:false, edit:false, reload:false});
		WikiaShoutBox.contel.children('div').eq(0).empty();
		$.cookies.del(WikiaShoutBox.cookietag);
	},
	expand: function() {
		WikiaShoutBox.widgetBtnVisible({expand:false, collapse:true});
		WikiaShoutBox.contel.addClass('expanded');
		$.cookies.set(WikiaShoutBox.cookietag, '1:1');
		// Posicionar al final si hay scroll
		var ul = WikiaShoutBox.contel.children('div').eq(0).find('ul').get(0);
		if (!ul) return;
		ul.scrollTop = ul.scrollHeight - ul.offsetHeight + 2;
	},
	collapse: function() {
		WikiaShoutBox.widgetBtnVisible({expand:true, collapse:false});
		WikiaShoutBox.contel.removeClass('expanded');
		$.cookies.set(WikiaShoutBox.cookietag, '1:0');
	},
	edit: function () {
		WikiaShoutBox.action('editform');
	},
	reload: function() {
		WikiaShoutBox.action('configure');
	},
	action: function(atype, params) {
		if (!WikiaShoutBox.contel) return;
		var req = {
			action: 'ajax',
			rs: 'WidgetFrameworkAjax',
			actionType: atype,
			id: WikiaShoutBox.wid,
			skin: WikiaShoutBox.skin,
			cbuser: encodeURIComponent(window.wgUserName) // un ID por usuario, por la caché
		};
		req = $.extend(req, params);
		WikiaShoutBox.busy(true);
		$.getJSON(wgScriptPath+wgScript, req, WikiaShoutBox.jsonRcvClosure(atype));

	},
	jsonRcvClosure: function(pAction) {
		return function(res) {
			if (res.success) {
				WikiaShoutBox[pAction+'Action'](res);
			} else {
				WikiaShoutBox.stop();
				var c = WikiaShoutBox.contel.children('div').eq(0);
				c.empty();
				c.append('<div class="WidgetShoutBoxChat">Ha ocurrido un error al intentar cargar el chat. Puede ser un problema temporal. Si este chat nunca te ha funcionado puedes <a href="javascript:WikiaShoutBox.fixConfig();void(0);">ejecutar el asistente</a> para intentar arreglarlo.</div>');
				WikiaShoutBox.expand();
				WikiaShoutBox.widgetBtnVisible({start:false, stop:true, collapse:false});
			}
			WikiaShoutBox.busy(false);
		};
	},
	configureAction: function(res) {
		if (res.type != 'WidgetShoutBox') {
			WikiaShoutBox.stop();
			var c = WikiaShoutBox.contel.children('div').eq(0);
			c.empty();
			c.append('Ha ocurrido un error al intentar cargar el chat. El widget retornado es de tipo ['+res.type+']. Puedes probar a <a href="javascript:WikiaShoutBox.fixConfig();void(0);">ejecutar el asistente</a> para intentar arreglarlo.');
			WikiaShoutBox.expand();
			WikiaShoutBox.widgetBtnVisible({start:false, stop:true, collapse:false});
			return;
		}
		var b = res.body;
		var pos = b.indexOf('<script');
		if (pos > 0) {
			b = b.substring(0, pos);
		}
		var ul = WikiaShoutBox.contel.children('div').eq(0).html(b).find('ul').get(0);
		if(WikiaShoutBox.focus) {
			$('#widget_' + WikiaShoutBox.wid + '_message').focus();
			WikiaShoutBox.focus = false;
		}
		// Posicionar al final si hay scroll
		if (!ul) return;
		ul.scrollTop = ul.scrollHeight - ul.offsetHeight + 2;
	},
	editformAction: function(res) {
		var b = res.content;
		WikiaShoutBox.contel.children('div').eq(0).html(b);
		$('#widget_' + res.id + '_save').click(WikiaShoutBox.editSave);
		$('#widget_' + res.id + '_cancel').click(WikiaShoutBox.editCancel);
	},
	editSave: function() {
		// get editor fields and add them to AJAX request params
		var fields = $('#widget_' + WikiaShoutBox.wid + '_editor').serializeArray();
		var req = {};
		for (var i = 0; i < fields.length; i++) {
			req[fields[i].name] = fields[i].value;
		}
		WikiaShoutBox.action('configure', req);
	},
	editCancel: function() {
		WikiaShoutBox.action('configure');
	},
	sendMsg: function(wId) {
		var messageBox = $('#widget_' + wId + '_message');
		if (!messageBox.length) {
			return;
		}
		var message = $.trim(messageBox.attr('value')).replace(new RegExp('\\{\\{', 'g'), '{&#123;').replace(new RegExp('<', 'g'), '&lt;').replace(new RegExp('>', 'g'), '&gt;').replace(new RegExp('\\\\', 'g'), '&#92;');
		var isMe = false;
		WikiaShoutBox.focus = true;
		if (message.length == 0) {
			WikiaShoutBox.reload();
			return;
		}
		// Eliminación
		if (message.indexOf('/me ') == 0) {
			isMe = true;
			message = $.trim(message.substr(3));
		}
		// Codificación
		if (!isMe && message.charAt(0) == '/') {
			message = '&#47;'+message.substr(1);
		}
		if (message.charAt(0) == ':') {
			message = '&#58;'+message.substr(1);
		}
		if (message.charAt(0) == ';') {
			message = '&#59;'+message.substr(1);
		}
		if (message.charAt(0) == '*') {
			message = '&#42;'+message.substr(1);
		}
		if (message.charAt(0) == '=') {
			message = '&#61;'+message.substr(1);
		}
		if (message.indexOf('----') == 0) {
			message = '&#45;'+message.substr(1);
		}
		if (message.charAt(message.length-1) == ':') {
			message = message.substr(0, message.length-1) + '&#58;';
		}
		// URLs
		var re_url = new RegExp('(\\b('+wgUrlProtocols+')[^\\]\\[<>"\\x00-\\x20\\x7F\\s]+)');
		if (re_url.test(message)) {
			var mre = re_url.exec(message);
			if (message.substr(mre.index).indexOf(']') == -1) {
				message = message.substr(0, mre.index) + mre[0] + ']' + message.substr(mre.index + mre[0].length);
			}
			if (mre.index == 0 || message.charAt(mre.index-1) != '[') {
				message = message.substr(0, mre.index) + '[' + message.substr(mre.index);
			}
		}
		if (message.length == 0) {
			WikiaShoutBox.reload();
			return;
		}
		WikiaShoutBox.action('configure', {message: encodeURIComponent( isMe ? '/me ' + message : message ) });
	},
	removeMsg: function (wid, mid) {
		WikiaShoutBox.action('configure', {msgid:mid});
	},
	busy: function(isBusy) {
		WikiaShoutBox.contel.children('h5').children('span.status').text(isBusy?' (Cargando...)':'');
	},
	fixConfig: function() {
		if (window.wgWidgetShoutBoxId) {
			var c = WikiaShoutBox.contel.children('div').eq(0);
			c.empty();
			c.append('<div class="WidgetShoutBoxChat">En tu archivo js personal está definida la variable wgWidgetShoutBoxId, con valor <span class="msg1"></span>.<br />' +
			'Para poder continuar y que esta no interfiera con la detección de tu configuración, debes borrar esa línea de tu archivo js personal, que puede estar situado en '+
			'<a class="msg2" target="_blank">este wiki</a> o en <a class="msg3" target="_blank">Community central</a>.<br />' +
			'Revisa que no esté en ninguna de las dos páginas enlazadas. Si lo está, borra la línea que la contenga, guarda la página y refresca la caché del navegador como se indica en esa misma página.</div>');
			c.find('.msg1').append(wgWidgetShoutBoxId.toString()).end()
				.find('.msg2').attr('href', wgScriptPath+wgScript+'?title='+encodeURIComponent(wgFormattedNamespaces['2'])+':'+encodeURIComponent(wgUserName.replace(new RegExp('\\s', 'g'), '_'))+'/'+skin+'.js&action=edit').end()
				.find('.msg3').attr('href', 'http://community.wikia.com'+wgScriptPath+wgScript+'?title=User:'+encodeURIComponent(wgUserName.replace(new RegExp('\\s', 'g'), '_'))+'/global.js&action=edit');
			WikiaShoutBox.expand();
			WikiaShoutBox.widgetBtnVisible({start:false, stop:true, collapse:false});
			return;
		}
		WikiaShoutBox.busy(true);
		$.getJSON(wgScriptPath+'/api.php', {action: 'query', meta: 'userinfo', uiprop: 'options', titles: 'User:' + wgUserName.replace(new RegExp('\\s', 'g'), '_')+'/'+skin+'.js', prop: 'info|revisions', intoken: 'edit', rvprop: 'content|timestamp', format: 'json'}, WikiaShoutBox.cbMwConfig);
	},
	cbMwConfig: function(data) {
		WikiaShoutBox.busy(false);
		var kTag = 's:4:"type";s:14:"WidgetShoutBox";s:2:"id";i:';
		var wCfg = data.query.userinfo.options.widgets;
		for (var pp in data.query.pages) {
			WikiaShoutBox._wgPage = data.query.pages[pp];
		}
		var _tmpCfg = wCfg;
		var instances = [];
		// 1. Buscar todas las instancias de WidgetShoutBox
		while (_tmpCfg.length) {
			var idx = _tmpCfg.indexOf(kTag);
			if (idx == -1) {
				break;
			}
			_tmpCfg = _tmpCfg.substr(idx+kTag.length);
			instances[instances.length] = _tmpCfg.substr(0, _tmpCfg.indexOf(';'));
		}
		if (instances.length) {
			// Puede ser que exista, pero tenga el mismo id que otro widget existente. En ese caso tendríamos que agregar uno nuevo
			// 2. Buscar de las instancias alguno que no esté duplicado
			for (var i = 0; i < instances.length; i++) {
				_tmpCfg = wCfg;
				var sTagId = 's:2:"id";i:'+instances[i]+';';
				var found = 0;
				while (_tmpCfg.length) {
					var idx = _tmpCfg.indexOf(sTagId);
					if (idx == -1) {
						break;
					}
					_tmpCfg = _tmpCfg.substr(idx+sTagId.length);
					found++;
				}
				if (found == 0) {
					alert('Error parseando preferencias');
					return;
				} else if (found == 1) {
					// Parece que es usable
					WikiaShoutBox.showFixedIdStatus(instances[i]);
					return;
				}
			}
		}

		// Si hemos llegado aquí es que no hay ninguno usable. Intentamos añadir uno
		WikiaShoutBox.busy(true);
		$.getJSON(wgScriptPath+wgScript, {action: 'ajax', rs: 'WidgetFrameworkAjax', actionType: 'add', index:'302', sidebar:'3', type: 'WidgetShoutBox'}, WikiaShoutBox.addAction);
	},
	addAction: function(res) {
		var kTag = 'id="widget';
		WikiaShoutBox.busy(false);
		if (!res.success || !res.widget) {
			alert('Error al añadir una nueva instancia de WidgetShoutBox');
			return;
		}
		var idx = res.widget.indexOf(kTag);
		var tmpWg = res.widget.substr(idx+kTag.length);
		WikiaShoutBox.showFixedIdStatus(tmpWg.substr(0, tmpWg.indexOf('"')));
	},
	showFixedIdStatus: function(id) {
		var c = WikiaShoutBox.contel.children('div').eq(0);
		var pagetext = '// Variable para que funcione el WidgetShoutbox\nwindow.wgWidgetShoutBoxId = \''+id+'\';\n// Fin variable para que funcione el WidgetShoutbox\n';
		c.empty();
		// WikiaShoutBox._wgPage
		c.append('<div class="WidgetShoutBoxChat">Para probar a arreglar el ShoutBox, es necesario que edites tu archivo js personal añadiendo un trozo de código.<br />Pulsa el siguiente botón para abrir tu página js personal donde se añadirá automáticamente al inicio de la misma el código. Tú solo tendrás que guardar.<br />Desde esa página, antes de guardar, podrás probar a abrir de nuevo el ShoutBox y ver si ya se ha solucionado. En ese caso podrás gardar.<br />Si en ese momento sigue sin funcionar, algo más debe estar interfiriendo con el código js y deberías pedir que alguien con conocimientos lo revise.' +
			'<form method="post" enctype="multipart/form-data" action="'+wgScriptPath+wgScript+'?title=' + encodeURIComponent(WikiaShoutBox._wgPage.title) + '&action=submit" target="_blank">' +
			'<textarea name="wpTextbox1" style="display:none;"></textarea>' +
			'<input type="hidden" name="wpSummary" value="Parámetro para WidgetShoutBox" />' +
			'<input type="hidden" name="wpStarttime" value="'+WikiaShoutBox._wgPage.starttimestamp.replace(new RegExp('\\D', 'g'), '')+'" />' +
			'<input type="submit" name="wpPreview" value="Añadir código para WidgetShoutBox" />' +
			'<input type="hidden" name="wpEditToken" value="' + WikiaShoutBox._wgPage.edittoken + '" /></form></div>');
		if (typeof WikiaShoutBox._wgPage.missing == 'string') {
			c.find('form').eq(0).append('<input type="hidden" name="wpEdittime" value="'+WikiaShoutBox._wgPage.starttimestamp.replace(new RegExp('\\D', 'g'), '')+'" />');
		} else {
			c.find('form').eq(0).append('<input type="hidden" name="wpEdittime" value="'+WikiaShoutBox._wgPage.revisions[0].timestamp.replace(new RegExp('\\D', 'g'), '')+'" />');
			pagetext += WikiaShoutBox._wgPage.revisions[0]['*'];
		}
		c.find('textarea').eq(0).val(pagetext);
		WikiaShoutBox.expand();
			WikiaShoutBox.widgetBtnVisible({start:false, stop:true, collapse:false});
		return;
	}
};

$(WikiaShoutBox.init);
