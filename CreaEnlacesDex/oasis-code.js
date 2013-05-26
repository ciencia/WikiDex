if (window.CreaEnlacesDex) {
	CreaEnlacesDex.registerRenderFn(function() {
		$('#LatestPhotosModule').before('<section class="CreaEnlacesDexModule module" id="CreaEnlacesDexModule"><h1>Enlaces a otras Pokédex</h1><ul></ul></section>');
	});
	CreaEnlacesDex.registerLinkFn(function(url, text, caption) {
		$('#CreaEnlacesDexModule').find('ul').eq(0).append($('<li></li>').append($('<a class="external"></a>').attr({href:url, title:caption}).text(text)));
	});
	$(CreaEnlacesDex.init);
}
