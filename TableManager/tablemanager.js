//<pre>
/************************************/
/* TableManager: Permite mostrar/ocultar y mover las columnas de una tabla a voluntad, y ordenar las filas por una o varias columnas
 * Copyright (C) 2008  Jesús Martínez Novo ([[User:Ciencia Al Poder]])
 * This program is free software; you can redistribute it and/or modify
 *   it under the terms of the GNU General Public License as published by
 *   the Free Software Foundation; either version 2 of the License, or
 *   (at your option) any later version
 *
 * @param {HTMLTable} table: Tabla sobre la que actuar
 * @param {object} cfg: (opcional) Configuración adicional:
 *   unsortable:{bool} Indica si debe deshabilitar la ordenación. En ese caso no aparecerán controles de ordenación. El mismo efecto se consigue con class="unsortable" en la tabla
 *   emptysort:{number} Indica la posición de las celdas vacías: 1: siempre arriba (independientemente de la ordenación), -1:siempre abajo (ídem), 0:lo determinará la función de ordenación
 *   sortCfg:{obj} Funciones de ordenación. El nombre de cada objeto se usará como CSSClass en los botones de ordenación (tm-sort-{nombre} (y sufijo -asc o -dsc según estado actual)). También sirve para determinar desde el inicio la función de ordenación a comprobar, oniendo como CSSClass en la columna sort{nombre}
 *    {
 *     testFn: {function} función que determina si debe ser ésta la ordenación. Parámetros: 1:celda 2:texto de la celda. Si es null se asume que debe usarse éste parámetro de ordenación y no comprueba el resto de opciones. Útil para la última función.
 *     sortFn: {function} función de ordenación (compatible con funciones de SortableTables de MediaWiki). Parámetros: a,b = Array[1:fila, 2:texto de la celda, 3:índice actual de fila, en negativo si se ordena al revés, 4:celda].
 *     priority: {number} prioridad para determinar qué reglas se comprobarán antes
 *     title: {string} Título del tipo de datos de ordenación, para el texto de los botones.
 *    }
 */
(function ( $ ) {
	var _k_status_idle = 0,
	_k_status_move = 1,
	_k_status_sort = 2,
	_trackStyles = {},
	_mainStyle = null,
	_stylesNeedRefresh = false,
	_texts = {
		move: 'Mover y organizar columnas',
		endmove: 'Finalizar',
		//order: 'Ordenar filas',
		hiddencols: 'Columnas ocultas:',
		hiddencolsnumber: 'Hay $1 columnas ocultas',
		movetip: 'Arrastra las columnas para moverlas de posición, o muévelas fuera de la tabla para ocultarlas. Mueve los encabezados de las columnas que están fuera hacia dentro de la tabla para volver a mostrarlas.'
	},
	_defaultsortcfg = {
		number: {
			testFn: function( c, t ) {
				return ( t === '' ) || (t === '-')  || /^([-]\s*)?(\d+|\d{1,3}([.]\d{3})+)(,\d+)?(\s*[%\u00a3$\u20ac])?$/.test( t );
			},
			sortFn: function( a, b ) {
				var A = a[1], B = b[1], aa, bb;
				if ( A === '' ) return B === '' ? 0 : -1;
				else if ( B === '' ) return 1;
				if ( A === '-' ) A = '0';
				else aa = _cleanupnumber( A );
				if ( B == '-' ) B = '0';
				else bb = _cleanupnumber( B );
				return ( isNaN( aa ) ? 0 : aa ) - ( isNaN( bb ) ? 0 : bb );
			},
			priority: 1,
			title: 'numérico'
		},
		text: {
			testFn: null,
			sortFn: function( a, b ) {
				var A = a[1].toLowerCase(), B = b[1].toLowerCase();
				return ( A < B ? -1 : ( A > B ? 1 : 0 ) );
			},
			priority: 99,
			title: 'alfabético'
		}
	},
	_cleanupnumber = function( num ) {
		return parseFloat( num.replace( /[.\s%\u00a3$\u20ac]/g, '' ).replace( ',' ,  '.' ) );
	},
	// uniqueId: uniqueId from the widget
	// kind: A key to be used when replacing other rules from the same widget
	// rules: object, where keys are css selectors and values are the rules (as string)
	// the selector may contain & which will be replaced by the unique id.
	_addStyle = function( uniqueId, kind, rules ) {
		if ( !_trackStyles[uniqueId] ) {
			_trackStyles[uniqueId] = {};
		}
		_trackStyles[uniqueId][kind] = rules;
		_stylesNeedRefresh = true;
	},
	_removeStyle = function( uniqueId, kind ) {
		if ( !kind ) {
			_trackStyles[uniqueId] = null;
		} else {
			if ( _trackStyles[uniqueId] && _trackStyles[uniqueId][kind] ) {
				_trackStyles[uniqueId][kind] = null;
			}
		}
		_stylesNeedRefresh = true;
	},
	_applyStyles = function( document ) {
		var css = [], uniqueId, kind, selector;
		if ( !_stylesNeedRefresh ) return;
		for ( uniqueId in _trackStyles ) {
			if ( _trackStyles.hasOwnProperty( uniqueId ) && _trackStyles[uniqueId] ) {
				for ( kind in _trackStyles[uniqueId] ) {
					if ( _trackStyles[uniqueId].hasOwnProperty( kind ) && _trackStyles[uniqueId][kind] ) {
						for ( selector in _trackStyles[uniqueId][kind] ) {
							if ( _trackStyles[uniqueId][kind].hasOwnProperty( selector ) && _trackStyles[uniqueId][kind][selector] ) {
								css[css.length] = selector.replace( /&/g, '#' + uniqueId ) + '{' + _trackStyles[uniqueId][kind][selector] + '}';
							}
						}
					}
				}
			}
		}
		if ( !_mainStyle ) {
			_mainStyle = $( '<style>', document ).attr( { 'type': 'text/css' } ).appendTo( 'head' );
		}
		_mainStyle.html( css.join('\n') );
		_stylesNeedRefresh = false;
	},
	// 0: [ x1, x2, y1, y2, h ]
	// 1-n: [ x1, x2, y1, y2, x, cellIndex ]
	_calculateColumnsRect = function( $table ) {
		var rectInfo = [], top, height, width, offset, i, $cell, previousX, cl;
		height = $table.height();
		offset = $table.offset();
		top = offset.top;
		rectInfo[0] = [
			offset.left - 30,
			offset.left + $table.width() + 30,
			top,
			top + height,
			height
		];
		previousX = rectInfo[0][0];
		cl = $table[0].rows[0].cells.length;
		for ( i = 0; i < cl; i++ ) {
			$cell = $($table[0].rows[0].cells[i]);
			if ( $cell.is( ':visible' ) ) {
				offset = $cell.offset();
				width = $cell.width();
				rectInfo[ rectInfo.length ] = [
					previousX,
					offset.left + width / 2,
					top,
					top + height,
					offset.left,
					$cell[0].cellIndex
				];
				previousX = offset.left + width / 2;
			}
		}
		rectInfo[ rectInfo.length ] = [
			previousX,
			rectInfo[0][1],
			top,
			top + height,
			rectInfo[0][1] - 30,
			cl
		];
		return rectInfo;
	};

	$.widget( 'ciencia.tablemanager', {
		version: 2,
		// Default options
		options: {
			show: true,
			hide: true,
			// Indica si debe deshabilitar la ordenación. En ese caso no aparecerán controles de ordenación. El mismo efecto se consigue con class="unsortable" en la tabla
			unsortable: false,
			// Indica la posición de las celdas vacías: 1: siempre arriba (independientemente de la ordenación), -1:siempre abajo (ídem), 0:lo determinará la función de ordenación
			emptysort: 0,
			// Funciones de ordenación
			// - testFn: {function} función que determina si debe ser ésta la ordenación. Parámetros: 1:celda 2:texto de la celda. Si es null se asume que debe usarse éste parámetro de ordenación y no comprueba el resto de opciones. Útil para la última función.
			// - sortFn: {function} función de ordenación (compatible con funciones de SortableTables de MediaWiki). Parámetros: a,b = Array[1:fila, 2:texto de la celda, 3:índice actual de fila, en negativo si se ordena al revés, 4:celda].
			// - priority: {number} prioridad para determinar qué reglas se comprobarán antes
			// - title: {string} Título del tipo de datos de ordenación
			sortcfg: $.extend( {}, _defaultsortcfg ),
			// CSS selectors (restricted to the first row), array of column indexes, or a number to auto-hide columns if it detects the table is too wide for current screen
			// - Array of CSS selectors: will match against children of first row
			// - Array of column indexes (base 0)
			// - Number: If positive, will hide first columns, last columns otherwise
			autohidecol: null
		},
		_status: 0,
		_mgrctrl: null,
		_movetipctrl: null,
		_cachedColumnsRect: null,
		_moveindicator: null,
		_columnvisibility: [],
		_create: function() {
			var i;
			if ( !this.element.is( 'table' ) ) return;
			this.element.uniqueId();
			this._mgrctrl = $( '<div class="tablemanager-control"></div>' ).append( [
				$( '<div class="tm-a-move btn"></div>' ).text( _texts.move ),
				//$( '<div class="tm-a-order btn"></div>' ).text( _texts.order ),
				$( '<div class="tm-extracolumns-tip"></div>' ),
				$( '<div class="tm-extracolumns"><div class="tm-hiddencols"></div></div>' ).prepend(
					$('<div>').text( _texts.hiddencols )
				).css( 'display', 'none' )
			] ).uniqueId().insertBefore( this.element );
			for ( i = this.element[0].rows[0].cells.length - 1; i >= 0; i-- ) {
				this._columnvisibility[i] = true;
			}
			this._on( this._mgrctrl, {
				'click .tm-a-move:eq(0)': function( event ) {
					if ( this._status === _k_status_move ) {
						this._trigger( 'disablecolumnmove' );
						this.disablecolumnmove();
					} else {
						this._trigger( 'enablecolumnmove' );
						this.enablecolumnmove();
					}
					event.preventDefault();
				},
				'click .tm-a-order:eq(0)': function( event ) {
					this._trigger( 'enableroworder' );
					//this.enableroworder();
					event.preventDefault();
				},
			} );
			this.applyautohide();
		},
		enablecolumnmove: function() {
			if ( this._status !== _k_status_idle ) return;
			this._status = _k_status_move;
			if ( ! this._movetipctrl ) {
				this._movetipctrl = $( '<div>' ).addClass( 'tablemanager-tip' ).text( _texts.movetip ).insertBefore( this._mgrctrl );
			}
			this._mgrctrl.find( '>.tm-extracolumns-tip' ).hide().end().find( '>.tm-extracolumns' ).show();
			this._show( this._movetipctrl, this.options.show );
			this._movetipctrl.position( {
				my: 'center bottom-10',
				at: 'center top',
				of: this._mgrctrl
			} );
			this._on( this.element, {
				'mousedown': function( event ) {
					var td, rules, selector, visibleCount, i;
					visibleCount = 0;
					for ( i = 0; i < this._columnvisibility.length; i++ ) {
						if ( this._columnvisibility[i] ) {
							visibleCount++;
							if ( visibleCount > 1 ) break;
						}
					}
					// Do not allow hiding the last visible column
					if ( visibleCount <= 1 ) return;
					if ( event.which === 1 ) {
						td = $( event.target ).closest( 'td,th' ).get(0);
						if ( !td ) return false;
						rules = {};
						selector = '& tr>td:nth-child($),& tr>th:nth-child($)'.replace( /\$/g, td.cellIndex + 1);
						rules[selector] = 'opacity: 0.3;';
						_addStyle( this.element[0].id, 'colmove', rules );
						this._cachedColumnsRect = _calculateColumnsRect( this.element );
						this._moveindicator.css( {
							top: this._cachedColumnsRect[0][2],
							height: this._cachedColumnsRect[0][4]
						} );
						this._setupMoveEvents( td.cellIndex );
						_applyStyles( this.document[0] );
						return false;
					}
				},
				'click': function( event ) {
					return false;
				}
			} );
			this._on( this._mgrctrl.find( '.tm-hiddencols:eq(0)' ), {
				'mousedown': function( event ) {
					var $div, $hidden, cellIndex = -1, i, visibleCount = 0, rules, selector;
					if ( event.which === 1 ) {
						$div = $( event.target ).closest( '.tm-hiddencols>div' );
						if ( !$div.length ) return false;
						$hidden = $div.parent().find( '>div' );
						for ( i = 0; i < $hidden.length; i++ ) {
							if ( $hidden.eq( i ).is( $div ) ) {
								cellIndex = i;
								break;
							}
						}
						if ( cellIndex === -1 ) return false;
						rules = {};
						selector = '#' + this._mgrctrl.attr( 'id' ) + ' .tm-hiddencols>div:nth-child($)'.replace( /\$/g, cellIndex + 1);
						rules[selector] = 'opacity: 0.3;';
						_addStyle( this.element[0].id, 'colmove', rules );
						this._cachedColumnsRect = _calculateColumnsRect( this.element );
						this._moveindicator.css( {
							top: this._cachedColumnsRect[0][2],
							height: this._cachedColumnsRect[0][4]
						} );
						// We need the cell index from the array of columns
						for ( i = 0; i < this._columnvisibility.length; i++ ) {
							if ( !this._columnvisibility[i] ) {
								if ( cellIndex === visibleCount ) {
									this._setupMoveEvents( i );
								}
								visibleCount++;
							}
						}
						_applyStyles( this.document[0] );
						return false;
					}
				},
				'click': function( event ) {
					return false;
				}
			} );
			this._moveindicator = $('<div class="tablemanager-moveindicator"></div>').appendTo( this.document[0].body );
			this._mgrctrl.find( '.tm-a-move:eq(0)' ).text( _texts.endmove );
			this.element.addClass( 'tm-state-move' );
		},
		disablecolumnmove: function() {
			var i, numhidden = 0;
			if ( this._status !== _k_status_move ) return;
			if ( this._movetipctrl ) {
				this._hide( this._movetipctrl, this.options.hide );
				this._mgrctrl.find( '>.tm-extracolumns' ).hide();
			}
			for ( i = 0; i < this._columnvisibility.length; i++ ) {
				if ( !this._columnvisibility[i] ) {
					numhidden++;
				}
			}
			if ( numhidden > 0 ) {
				this._mgrctrl.find( '>.tm-extracolumns-tip' ).text( _texts.hiddencolsnumber.replace( '$1', numhidden ) ).show();
			}
			this._off( this.element, 'mousedown click' );
			this._off( this._mgrctrl.find( '.tm-hiddencols:eq(0)' ), 'mousedown click' );
			this._mgrctrl.find( '.tm-a-move:eq(0)' ).text( _texts.move );
			this._status = _k_status_idle;
			this.element.removeClass( 'tm-state-move' );
		},
		_setupMoveEvents: function( cellIndex ) {
			this._on( this.document.find( 'body' ), {
				'mousemove': function( event ) {
					var i;
					if ( this._cachedColumnsRect ) {
						if ( event.pageX >= this._cachedColumnsRect[0][0] &&
							event.pageX <= this._cachedColumnsRect[0][1] &&
							event.pageY >= this._cachedColumnsRect[0][2] &&
							event.pageY <= this._cachedColumnsRect[0][3]
						) {
							for ( i = 1; i < this._cachedColumnsRect.length; i++ ) {
								if ( event.pageX <= this._cachedColumnsRect[i][1] ) {
									this._moveindicator.css( {
										display: 'block',
										left: this._cachedColumnsRect[i][4]
									} );
									break;
								}
							}
						} else {
							this._moveindicator.css({ display: 'none' });
						}
					}
					return false;
				},
				'mouseup': function( cellIndex ) {
					return function( event ) {
						var i;
						this._off( this.document.find( 'body' ), 'mousemove mouseup' );
						this._moveindicator.css({ display: 'none' });
						_removeStyle( this.element[0].id, 'colmove' );
						if ( this._cachedColumnsRect ) {
							if ( event.pageX >= this._cachedColumnsRect[0][0] &&
								event.pageX <= this._cachedColumnsRect[0][1] &&
								event.pageY >= this._cachedColumnsRect[0][2] &&
								event.pageY <= this._cachedColumnsRect[0][3]
							) {
								for ( i = 1; i < this._cachedColumnsRect.length; i++ ) {
									if ( event.pageX <= this._cachedColumnsRect[i][1] ) {
										this.changecolumnvisible( cellIndex, true );
										this.movecolumn( cellIndex, this._cachedColumnsRect[i][5] );
										break;
									}
								}
							} else {
								this.changecolumnvisible( cellIndex, false );
							}
						}
						_applyStyles( this.document[0] );
						return false;
					};
				}( cellIndex )
			} );
		},
		// Moves a column
		// - originalIndex: self-explanatory
		// - newIndex: column will be moved before the column currently at this position
		movecolumn: function( originalIndex, newIndex ) {
			var i, ncols, row, visible;
			// There's nothing to do if we move the column before itself or before the next column
			if ( newIndex == originalIndex || newIndex == originalIndex + 1 ) return;
			this.element.css('display', 'none');
			ncols = this.element[0].rows[0].cells.length;
			// Mover columnas
			for ( i = this.element[0].rows.length - 1; i >= 0; i-- ) {
				row = this.element[0].rows[i];
				if ( newIndex >= ncols ) {
					row.appendChild( row.cells[ originalIndex ] );
				} else {
					row.insertBefore( row.cells[ originalIndex ], row.cells[ newIndex ] );
				}
			}
			// Move visibility references
			visible = this._columnvisibility[ originalIndex ];
			this._columnvisibility.splice( originalIndex, 1 );
			if ( newIndex > originalIndex ) {
				this._columnvisibility.splice( newIndex - 1, 0, visible );
			} else {
				if ( newIndex >= ncols ) {
					this._columnvisibility.push( visible );
				} else {
					this._columnvisibility.splice( newIndex, 0, visible );
				}
			}
			this._refreshHiddenColumnStyles();
			_applyStyles( this.document[0] );
			this.element.css('display', '');
		},
		// Changes visibility of a column
		changecolumnvisible: function( originalIndex, visible ) {
			var i, pos, $clone, $hidden, $hiddenDiv;
			// Shortcut if visibility doesn't change
			if ( this._columnvisibility[originalIndex] === visible ) return;
			this.element.css('display', 'none');
			$hiddenDiv = this._mgrctrl.find( '.tm-hiddencols:eq(0)' );
			$hidden = $hiddenDiv.find( '>div' );
			pos = 0;
			if ( visible ) {
				// Remove from the list of hidden columns
				for ( i = 0; i < this._columnvisibility.length; i++ ) {
					if ( i === originalIndex ) {
						$hidden.eq( pos ).remove();
						break;
					}
					if ( this._columnvisibility[i] === false ) {
						pos++;
					}
				}
			} else {
				// Add to the list of hidden columns, at the correct position
				for ( i = 0; i < this._columnvisibility.length; i++ ) {
					if ( i === originalIndex ) {
						$clone = $( '<div>' ).html( $( this.element[0].rows[0].cells[ originalIndex ] ).html() );
						if ( $hidden.length > pos ) {
							$clone.insertBefore( $hidden.eq( pos ) );
						} else {
							$clone.appendTo( $hiddenDiv );
						}
						break;
					}
					if ( this._columnvisibility[i] === false ) {
						pos++;
					}
				}
			}
			this._columnvisibility[ originalIndex ] = visible;
			this._refreshHiddenColumnStyles();
			_applyStyles( this.document[0] );
			this.element.css('display', '');
		},
		// Rebuilds the styles of hidden columns
		_refreshHiddenColumnStyles: function() {
			var i, rules, selector = [];
			for ( i = 0; i < this._columnvisibility.length; i++ ) {
				if ( this._columnvisibility[i] === false ) {
					selector[selector.length] = '& tr>td:nth-child($),& tr>th:nth-child($)'.replace( /\$/g, i + 1 );
				}
			}
			if ( selector.length ) {
				rules = {};
				rules[ selector.join(',') ] = 'display:none;';
				_addStyle( this.element[0].id, 'hiddencols', rules );
			} else {
				_removeStyle( this.element[0].id, 'hiddencols' );
			}
		},
		applyautohide: function() {
			if ( !this.options.autohidecol ) return;
			if ( $.isArray( this.options.autohidecol ) ) {
			}
		}
	});

}( jQuery ));

