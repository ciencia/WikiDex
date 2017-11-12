/************************************/
/* TableManager: Permite mostrar/ocultar y mover las columnas de una tabla a voluntad, y ordenar las filas por una o varias columnas
 * Copyright (C) 2017 Jesús Martínez Novo ([[User:Ciencia Al Poder]])
 * @license: MIT
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
(function ( $, mw, global ) {
	var _k_status_idle = 0,
	_k_status_move = 1,
	_k_status_sort = 2,
	_k_prevent_text_selection = '-webkit-touch-callout:none;-webkit-user-select:none;-khtml-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;',
	_trackStyles = {},
	_mainStyle = null,
	_stylesNeedRefresh = false,
	_globalID = 0,
	_tmObject = null,
	_texts = {
		move: 'Mover y organizar columnas',
		//order: 'Ordenar filas',
		hiddencols: 'Columnas ocultas:',
		hiddencolsnumber: '$1 columna(s) oculta(s)',
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
	},
	// Sets an unique ID to an element, if it doesn't have one already
	_setUniqueID = function( $element ) {
		var id;
		if ( $element.attr( 'id' ) ) return;
		do {
			id = 'tm-globalid-' + _globalID.toString();
			_globalID++;
		} while ( document.getElementById( id ) );
		$element.attr( 'id', id );
	},
	_fixThisOnFunction = function( that, fn ) {
		return function( event ) {
			return fn.apply( that, arguments );
		};
	};

	_tmObject = {
		version: 2.0,
		// Default options
		options: {
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
			// Function returning an array of column indexes to hide. Inside the function, "this" will be the table element
			autohidecol: null
		},
		_status: 0,
		_mgrctrl: null,
		_movebtn: null,
		_movetipctrl: null,
		_hiddencolumnstip: null,
		_cachedColumnsRect: null,
		_moveindicator: null,
		_columnvisibility: [],
		_create: function() {
			var i;
			_setUniqueID( this.$element );
			this._movebtn = new OO.ui.ToggleButtonWidget( {
				label: _texts.move,
				flags: [ 'progressive' ]
			} );
			this._mgrctrl = $( '<div class="tablemanager-control"></div>' ).append( [
				this._movebtn.$element,
				$( '<div class="tm-extracolumns"><div class="tm-hiddencols"></div></div>' ).prepend(
					$('<div>').text( _texts.hiddencols )
				).css( 'display', 'none' )
			] ).insertBefore( this.$element );
			_setUniqueID( this._mgrctrl );
			for ( i = this.$element[0].rows[0].cells.length - 1; i >= 0; i-- ) {
				this._columnvisibility[i] = true;
			}
			this._movebtn.on( 'click', _fixThisOnFunction( this, function( event ) {
				if ( this._status === _k_status_move ) {
					this.disablecolumnmove();
				} else {
					this.enablecolumnmove();
				}
			} ) );
			this.applyautohide();
			this.$element.addClass( 'tablemanager-table' );
		},
		enablecolumnmove: function() {
			if ( this._status !== _k_status_idle ) return;
			this._status = _k_status_move;
			if ( ! this._movetipctrl ) {
				this._movetipctrl = new OO.ui.PopupWidget( {
					$content: $( '<p>' ).text( _texts.movetip ),
					$floatableContainer: this._movebtn.$element,
					padded: true,
					align: 'forwards',
					position: 'above',
					width: Math.min( 600, $( document.body ).width() * 0.8 ),
				} );
				this._movetipctrl.$element.insertBefore( this._mgrctrl );
			}
			if ( this._hiddencolumnstip ) {
				this._hiddencolumnstip.hide();
			}
			this._mgrctrl.find( '>.tm-extracolumns' ).show();
			this._movetipctrl.toggle( true );
			this.$element.on( {
				'mousedown.tablemanager': _fixThisOnFunction( this, function( event ) {
					if ( event.which === 1 ) {
						this._startdrageventfromtable( event.target );
						return false;
					}
				} ),
				'touchstart.tablemanager': _fixThisOnFunction( this, function( event ) {
					this._startdrageventfromtable( event.target );
					return false;
				} ),
				'click.tablemanager': function( event ) {
					return false;
				}
			} );
			this._mgrctrl.find( '.tm-hiddencols:eq(0)' ).on( {
				'mousedown.tablemanager': _fixThisOnFunction( this, function( event ) {
					if ( event.which === 1 ) {
						this._startdrageventfromhidden( event.target );
						return false;
					}
				} ),
				'touchstart.tablemanager': _fixThisOnFunction( this, function( event ) {
					this._startdrageventfromhidden( event.target );
					return false;
				} ),
				'click.tablemanager': function( event ) {
					return false;
				}
			} );
			this._moveindicator = $('<div class="tablemanager-moveindicator"></div>').appendTo( this.$document[0].body );
			this.$element.addClass( 'tm-state-move' );
			_addStyle( this.$element[0].id, 'enablecolumnmove', { '& a': 'pointer-events:none;' } );
			_applyStyles();
		},
		_startdrageventfromtable: function( target ) {
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
			td = $( target ).closest( 'td,th' ).get(0);
			if ( !td ) return;
			rules = {};
			selector = '& tr>td:nth-child($),& tr>th:nth-child($)'.replace( /\$/g, td.cellIndex + 1);
			rules[selector] = 'opacity: 0.3;';
			rules.body = _k_prevent_text_selection;
			_addStyle( this.$element[0].id, 'colmove', rules );
			this._cachedColumnsRect = _calculateColumnsRect( this.$element );
			this._moveindicator.css( {
				top: this._cachedColumnsRect[0][2],
				height: this._cachedColumnsRect[0][4]
			} );
			this._setupMoveEvents( td.cellIndex );
			_applyStyles( this.$document[0] );
		},
		_startdrageventfromhidden: function( target ) {
			var $div, $hidden, cellIndex = -1, i, visibleCount = 0, rules, selector;
			$div = $( target ).closest( '.tm-hiddencols>div' );
			if ( !$div.length ) return;
			$hidden = $div.parent().find( '>div' );
			for ( i = 0; i < $hidden.length; i++ ) {
				if ( $hidden.eq( i ).is( $div ) ) {
					cellIndex = i;
					break;
				}
			}
			if ( cellIndex === -1 ) return;
			rules = {};
			selector = '#' + this._mgrctrl.attr( 'id' ) + ' .tm-hiddencols>div:nth-child($)'.replace( /\$/g, cellIndex + 1);
			rules[selector] = 'opacity: 0.3;';
			rules.body = _k_prevent_text_selection;
			_addStyle( this.$element[0].id, 'colmove', rules );
			this._cachedColumnsRect = _calculateColumnsRect( this.$element );
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
			_applyStyles( this.$document[0] );
		},
		disablecolumnmove: function() {
			if ( this._status !== _k_status_move ) return;
			if ( this._movetipctrl ) {
				this._movetipctrl.toggle( false );
				this._mgrctrl.find( '>.tm-extracolumns' ).hide();
			}
			this.$element.off( 'mousedown.tablemanager click.tablemanager' );
			this._mgrctrl.find( '.tm-hiddencols:eq(0)' ).off( 'mousedown.tablemanager click.tablemanager' );
			this._movebtn.setLabel( _texts.move );
			this._rebuildHiddenTip();
			this.$element.removeClass( 'tm-state-move' );
			_removeStyle( this.$element[0].id, 'enablecolumnmove' );
			_applyStyles();
			this._status = _k_status_idle;
		},
		_setupMoveEvents: function( cellIndex ) {
			this.$document.find( 'body' ).on( {
				'mousemove.tablemanager': _fixThisOnFunction( this, function( event ) {
					this._movedragevent( event.pageX, event.pageY );
					return false;
				} ),
				'touchmove.tablemanager': _fixThisOnFunction( this, function( event ) {
					var eventprops = event.originalEvent.targetTouches[0];
					this._movedragevent( eventprops.pageX, eventprops.pageY );
					return false;
				} ),
				'mouseup.tablemanager': _fixThisOnFunction( this, function( cellIndex ) {
					return function( event ) {
						this._enddragevent( event.pageX, event.pageY, cellIndex );
						return false;
					};
				}( cellIndex ) ),
				'touchend.tablemanager': _fixThisOnFunction( this, function( cellIndex ) {
					return function( event ) {
						var eventprops = event.originalEvent.changedTouches[0];
						this._enddragevent( eventprops.pageX, eventprops.pageY, cellIndex );
						return false;
					};
				}( cellIndex ) )
			} );
		},
		_movedragevent: function( posX, posY ) {
			var i;
			if ( this._cachedColumnsRect ) {
				if ( posX >= this._cachedColumnsRect[0][0] &&
					posX <= this._cachedColumnsRect[0][1] &&
					posY >= this._cachedColumnsRect[0][2] &&
					posY <= this._cachedColumnsRect[0][3]
				) {
					for ( i = 1; i < this._cachedColumnsRect.length; i++ ) {
						if ( posX <= this._cachedColumnsRect[i][1] ) {
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
		},
		_enddragevent: function( posX, posY, cellIndex ) {
			var i;
			this.$document.find( 'body' ).off( 'mousemove.tablemanager touchmove.tablemanager mouseup.tablemanager touchend.tablemanager' );
			this._moveindicator.css({ display: 'none' });
			_removeStyle( this.$element[0].id, 'colmove' );
			if ( this._cachedColumnsRect ) {
				if ( posX >= this._cachedColumnsRect[0][0] &&
					posX <= this._cachedColumnsRect[0][1] &&
					posY >= this._cachedColumnsRect[0][2] &&
					posY <= this._cachedColumnsRect[0][3]
				) {
					for ( i = 1; i < this._cachedColumnsRect.length; i++ ) {
						if ( posX <= this._cachedColumnsRect[i][1] ) {
							this.changecolumnvisible( cellIndex, true );
							this.movecolumn( cellIndex, this._cachedColumnsRect[i][5] );
							break;
						}
					}
				} else {
					this.changecolumnvisible( cellIndex, false );
				}
			}
			_applyStyles( this.$document[0] );
		},
		// Moves a column
		// - originalIndex: self-explanatory
		// - newIndex: column will be moved before the column currently at this position
		movecolumn: function( originalIndex, newIndex ) {
			var i, ncols, row, visible;
			// There's nothing to do if we move the column before itself or before the next column
			if ( newIndex == originalIndex || newIndex == originalIndex + 1 ) return;
			this.$element.css('display', 'none');
			ncols = this.$element[0].rows[0].cells.length;
			// Mover columnas
			for ( i = this.$element[0].rows.length - 1; i >= 0; i-- ) {
				row = this.$element[0].rows[i];
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
			_applyStyles( this.$document[0] );
			this.$element.css('display', '');
		},
		// Changes visibility of a column or array of columns
		changecolumnvisible: function( indices, visible ) {
			var i, pos, $clone, $hidden, $hiddenDiv, originalIndex, ii, doSomething = false;
			// Shortcut if visibility doesn't change
			if ( !$.isArray( indices ) ) {
				indices = [ indices ];
			}
			for ( ii = 0; ii < indices.length; ii++ ) {
				originalIndex = indices[ii];
				if ( this._columnvisibility[originalIndex] === visible ) continue;
				if ( !doSomething ) {
					this.$element.css('display', 'none');
					doSomething = true;
					$hiddenDiv = this._mgrctrl.find( '.tm-hiddencols:eq(0)' );
					$hidden = $hiddenDiv.find( '>div' );
				}
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
							$clone = $( '<div tabindex="0"></div>' ).html( $( this.$element[0].rows[0].cells[ originalIndex ] ).html() );
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
			}
			if ( !doSomething ) return;
			this._refreshHiddenColumnStyles();
			_applyStyles( this.$document[0] );
			this.$element.css('display', '');
			// If the scroll changes somehow, sometimes the popup moves
			if ( this._movetipctrl ) {
				this._movetipctrl.updateDimensions();
			}
		},
		_rebuildHiddenTip: function() {
			var i, numhidden = 0;
			for ( i = 0; i < this._columnvisibility.length; i++ ) {
				if ( !this._columnvisibility[i] ) {
					numhidden++;
				}
			}
			if ( numhidden > 0 ) {
				if ( !this._hiddencolumnstip ) {
					this._hiddencolumnstip = $( '<div class="tm-hiddencols-tip"></div>' ).text( _texts.hiddencolsnumber.replace( '$1', numhidden ) ).insertAfter( this._movebtn.$element );
				}
				this._hiddencolumnstip.text( _texts.hiddencolsnumber.replace( '$1', numhidden ) ).show();
			}
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
				_addStyle( this.$element[0].id, 'hiddencols', rules );
			} else {
				_removeStyle( this.$element[0].id, 'hiddencols' );
			}
		},
		applyautohide: function() {
			var toHide;
			if ( !this.options.autohidecol ) return;
			toHide = this.options.autohidecol.call( this.$element[0] );
			if ( $.isArray( toHide ) ) {
				this.changecolumnvisible( toHide, false );
			}
			this._rebuildHiddenTip();
		}
	};

	global.TableManager = function( element, options ) {
		var that;
		that = $.extend( true, {}, _tmObject );
		that.$element = $( element ).eq(0);
		if ( !that.$element.is( 'table' ) ) return;
		that.$document = $( document );
		that.options = $.extend( true, {}, _tmObject.options, options );
		that._create.call( that );
		that.$element.data( 'TableManager', that );
	};

}( jQuery, mw, window ));

