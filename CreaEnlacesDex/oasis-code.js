if (window.CreaEnlacesDex) {
	CreaEnlacesDex.registerRenderFn(function() {
		$('#p-tb').after('<div class="portlet" id="p-dexlinks"><h5>Otras Pokédex</h5><div class="pBody"><ul></ul></div></div>');
	});
	CreaEnlacesDex.registerLinkFn(function(url, text, caption) {
		addPortletLink('p-dexlinks', url, text, false, caption);
	});
	$(CreaEnlacesDex.init);
}
