(function( $, mw, window ) {
	var mapCellToIndex = function() { return this.cellIndex; };

	$( function() {
		var startupElements = [], i;
		$( 'table.movnivel' ).each( function() {
			startupElements[startupElements.length] = {
				element: this,
				cfg: {
					autohidecol: function() {
						var winWidth = $( window ).width(), $tr0, eds, colsToRemove, minEd;
						if ( winWidth > 1000 || this.rows.length === 0 ) return;
						$tr0 = $( this.rows[ 0 ] );
						eds = $tr0.find( '>.movedicion' ).map( mapCellToIndex ).get();
						minEd = 2;
						if ( winWidth > 600 ) {
							minEd = 5;
						}
						// Quitar columnas de movimiento por nivel excepto las últimas
						colsToRemove = eds.slice( 0, ( -1 ) * minEd );
						// Quitar también concurso
						if ( winWidth < 600 ) {
							colsToRemove.push( $tr0.find( '>.concurso' ).map( mapCellToIndex ).get(0) );
						}
						return colsToRemove;
					}
				}
			};
		} );
		$( 'table.movhuevo,table.movespecial' ).each( function() {
			startupElements[startupElements.length] = {
				element: this,
				cfg: {
					autohidecol: function() {
						var winWidth = $( window ).width(), $tr0, colsToRemove;
						if ( winWidth > 600 || this.rows.length === 0 ) return;
						$tr0 = $( this.rows[ 0 ] );
						colsToRemove = $tr0.find( '>.ejemplo' ).map( mapCellToIndex ).get();
						return colsToRemove;
					}
				}
			};
		} );
		$( 'table.movmtmo,table.movtutor' ).each( function() {
			startupElements[startupElements.length] = {
				element: this,
				cfg: {
					autohidecol: function() {
						var winWidth = $( window ).width(), $tr0, colsToRemove;
						if ( winWidth > 600 || this.rows.length === 0 ) return;
						$tr0 = $( this.rows[ 0 ] );
						colsToRemove = $tr0.find( '>.concurso' ).map( mapCellToIndex ).get();
						return colsToRemove;
					}
				}
			};
		} );

		if ( startupElements.length > 0 ) {
			mw.loader.using( [ 'oojs-ui-widgets' ] ).then( function() {
				for ( i = 0; i < startupElements.length; i++ ) {
					window.TableManager( startupElements[i].element, startupElements[i].cfg );
				}
			} );
		}
	} );
})( jQuery, mw, window );

