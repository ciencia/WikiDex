if (window.CreaEnlacesDex) {
	CreaEnlacesDex.registerRenderFn(function() {
		$('#WikiaRail').append('<section class="dexlinks module" id="p-dexlinks"><h1>Otras Pokédex</h1><ul></ul></section>');
	});
	CreaEnlacesDex.registerLinkFn(function(url, text, caption) {
		$('#p-dexlinks').find('ul').eq(0).append($('<li></li>').append($('<a class="external"></a>').attr({href:url, title:caption}).text(text)));
	});
	$(CreaEnlacesDex.init);
}
