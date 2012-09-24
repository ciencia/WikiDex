/*<pre> */
// Une las filas de varias tablas en una misma tabla.
// (c) Jesús Martínez Novo (Ciencia Al Poder)
// Licencia/License: http://www.gnu.org/copyleft/gpl.html GNU General Public Licence 2.0 or later
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License
// as published by the Free Software Foundation; either version 2
// of the License, or (at your option) any later version.
(function() {

	var _btnTitle = 'Unir las tablas en una sola, útil para ordenar las filas de la tabla.',
	_timeoutToHide = 500,
	_tableClassName = 'mergetable',
	_mergeButton = null,
	_timeoutId = null,
	_parentTable = null,
	_buttonHeight = 0,
	_buttonVisible = false,
	_init = function() {
		_getTables().each(function() {
			var header = _getTableHeader(this);
			if (header !== null) {
				$(header).bind({
					mouseover: _muestraMergeIcon,
					mouseout: _ocultaMergeIconDelayed
				});
			}
		});
	},
	_getTables = function() {
		return $('table.'+_tableClassName, '#mw-content-text');
	},
	_getTableHeader = function(table) {
		var header = null;
		if (table.tHead && table.tHead.rows.length > 0) {
			header = table.tHead;
		} else if (table.rows.length > 0) {
			header = table.rows[0];
		}
		return header;
	},
	_creaButton = function() {
		_mergeButton = document.createElement('div');
		$(_mergeButton).attr({
			id: 'mergetables-button',
			title: _btnTitle
		}).bind({
			click: _uneTablas,
			mouseover: _holdMergeIcon,
			mouseout: _ocultaMergeIconDelayed
		}).appendTo(document.body);
		_buttonHeight = $(_mergeButton).height();
	},
	_muestraMergeIcon = function(e) {
		var position;
		if (_timeoutId !== null) {
			window.clearTimeout(_timeoutId);
			_timeoutId = null;
		}
		if (_mergeButton === null) {
			_creaButton();
		}
		position = $(e.target).closest('table').offset();
		if (position.top != 0) {
			position.top -= _buttonHeight + 5;
		}
		$(_mergeButton).show().offset(position);
		_buttonVisible = true;
	},
	_holdMergeIcon = function() {
		if (_timeoutId !== null) {
			window.clearTimeout(_timeoutId);
			_timeoutId = null;
		}
	},
	_ocultaMergeIconDelayed = function() {
		if (_buttonVisible && _timeoutId === null) {
			_timeoutId = window.setTimeout(_ocultaMergeIcon, _timeoutToHide);
		}
	},
	_ocultaMergeIcon = function() {
		if (_timeoutId !== null) {
			window.clearTimeout(_timeoutId);
			_timeoutId = null;
		}
		$(_mergeButton).hide();
		_buttonVisible = false;
	},
	_uneTablas = function(e) {
		_ocultaMergeIcon();
		$(_mergeButton).unbind().remove();
		_mergeButton = null;
		_getTables().each(function() {
			var startRow = -1, header = _getTableHeader(this);
			if (header !== null) {
				$(header).unbind({
					mouseover: _muestraMergeIcon,
					mouseout: _ocultaMergeIconDelayed
				});
			}
			if (_parentTable === null) {
				_parentTable = this;
				return;
			}
			for (var i = 0; i < this.tBodies.length; i++) {
				if (startRow == -1 || startRow == 1) {
					if (i == 0 && header === this.tBodies[i].rows[0]) {
						startRow = 1;
					} else {
						startRow = 0;
					}
				}
				while (this.tBodies[i].rows.length > startRow) {
					_parentTable.tBodies[_parentTable.tBodies.length - 1].appendChild(this.tBodies[i].rows[startRow]);
				}
			}
			$(this).remove();
		});
		_parentTable = null;
	};

	$(_init);

})();
/* </pre> */
