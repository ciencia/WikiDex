// <pre>
/*
 * DisableFirstSubmit: Clase para deshbilitar el botón de guardar la primera vez que se edita un artículo.
 * No lo deshabilita físicamente, pero en lugarde guardar avisará al usuario con un mensaje que obtiene de una página del wiki.
 * Copyright (C) 2009  Jesús Martínez Novo ([[User:Ciencia Al Poder]])
 * This program is free software; you can redistribute it and/or modify
 *   it under the terms of the GNU General Public License as published by
 *   the Free Software Foundation; either version 2 of the License, or
 *   (at your option) any later version
*/
(function(){
	var $ = jQuery;

	DisableFirstSubmit = function(submit, title){
		this.dialogOpened = false;
		if (submit && title) {
			this.init(submit, title);
		}
	};

	DisableFirstSubmit.prototype = {
		init: function(submit, title){
			this.submit = submit;
			this.reqURL = wgServer+wgScript+'?title='+encodeURIComponent(title)+'&action=raw&templates=expand&maxage=3600&smaxage=3600';
			this.requestContent();
		},	
		onFirstSubmitUserpage: function(e){
			var target = e.target;
			if (target && target.nodeType == 1 && target.id == this.submit){
				target.blur();
				window.scrollTo(0,0);
				if (this.dialogOpened) {
					this.dlg.showModal();
				} else {
					this.dlg.appendTo('#positioned_elements').makeModal({width: 500, persistent: true});
				}
				this.dialogOpened = true;
				return false;
			}
		},
		requestContent: function(){
			$.get(this.reqURL, function(thisArg){
				return function(data){ thisArg.setupEvents(data); };
			}(this));
		},
		setupEvents: function(responseText){
			this.dlg = $($UT.create('div', {'classs':'userpageSubmitDlg', title:'¡Atención!'})).append(responseText);
			$($UT.get(this.submit)).bind('click', function(thisArg){
				return function(e){ return thisArg.onFirstSubmitUserpage(e); };
			}(this));
		}
	};
})();

new DisableFirstSubmit('wpSave', 'MediaWiki:Common.js/Clases/DisableFirstSubmit.js/Userpage');
// </pre>
