/* <pre>
 * UploadValidator v4.1: Realiza validaciones en el momento de subir archivos, proporcionando sugerencias de nombrado si
 *    es posible, categorización o licencia.
 * Copyright (c) 2010 - 2014 Jesús Martínez (User:Ciencia_Al_Poder)
 * This program is free software; you can redistribute it and/or modify
 *   it under the terms of the GNU General Public License as published by
 *   the Free Software Foundation; either version 2 of the License, or
 *   (at your option) any later version
 *
 * @requires: jquery.ui.dialog
 */

window.UploadValidator = (function($, mw) {
	'use strict';
	var _reTemplates = /\{\{\s*([^\{\}\|]+)\s*(\|[^\}]+)?\}\}/g,
	_reCategories = null,
	_reTitleWhiteSpace = /[ _]+/g,
	_validators = [],
	_results = null,
	_currentIndex = 0,
	_validationParams = null,
	_messages = {},
	_dlg = null,
	_closing = false,
	_init = function() {
		_initRegExp();
	},
	// Logging utility
	_log = function(text) {
		if (window.console && window.console.log) {
			window.console.log('UploadValidator: ' + text);
		}
	},
	// Inits category regexp to find categories present on the description text
	_initRegExp = function() {
		var catNS = 'Category';
		if (mw.config.get('wgContentLanguage') != 'en' && mw.config.get('wgFormattedNamespaces')) {
			catNS += '|' + mw.config.get('wgFormattedNamespaces')['14'];
		}
		_log('catNS: '+catNS);
		_reCategories = new RegExp('\\[\\[\\s*('+catNS+')\\s*:\\s*([^\\|\\[\\]]+)\\]\\]', 'gi');
	},
	_validate = function(params) {
		var done;
		_validationParams = params;
		_log('Start validation.');
		// Nothing to do if there are no validators registered, or no sources were provided
		if (_validators.length === 0 || !params.sources || params.sources.length === 0) {
			_log('No validators registered, or no sources provided.');
			_endValidation(true);
			return true;
		}
		_sortValidators();
		_results = [];
		_currentIndex = 0;
		// Runs validators for each source
		done = _runValidators();
		if (done) {
			return _checkFinalStatus();
		}
	},
	// Checks if it needs to display validation issues or end the validation
	_checkFinalStatus = function() {
		// There were no async validations
		if (_results.length === 0) {
			_endValidation(true);
			return true;
		}
		_log('Displaying validation issues.');
		mw.loader.using('jquery.ui.dialog', function() {
			// Display first validation
			_showDlg(_results[_currentIndex]);
		});
		return false;
	},
	_makeResumeCallback = function(resume_file, resume_validation, resume_originaltitle) {
		return function(vi) {
			var done;
			_log('Async validation ended. Resuming validations.');
			done = _runValidators(resume_file, resume_validation, resume_originaltitle, vi);
			if (done) {
				_checkFinalStatus();
			}
		};
	},
	// Run validators against upload information
	_runValidators = function(resume_file, resume_validation, resume_originaltitle, resume_vi) {
		var ui, validator, validationinfo, originaltitle;
		// Runs validators for each source
		for (var i = (resume_file || 0); i < _validationParams.sources.length; i++) {
			_log('Validating file '+i);
			ui = _getUploadInfoToValidate(i);
			// Hard validations: It must contain a title and file
			if (!ui.title) {
				// Clear any existing validations
				_results = [];
				_results.push(_getMsg('notitle'));
				return true;
			} else if (!ui.filename) {
				// Clear any existing validations
				_results = [];
				_results.push(_getMsg('nofilename', [ ui.title ]));
				return true;
			}
			originaltitle = resume_originaltitle || ui.title;
			for (var vPos = (resume_validation || 0); vPos < _validators.length; vPos++) {
				validator = _validators[vPos];
				if (typeof resume_validation != 'undefined') {
					validationinfo = resume_vi;
					resume_file = undefined;
					resume_validation = undefined;
					resume_originaltitle = undefined;
					resume_vi = undefined;
				} else {
					validationinfo = validator.validate(ui);
				}
				if (!validationinfo) {
					continue;
				}
				// Check for async validators
				if (typeof validationinfo == 'function') {
					_log('Performing async validation.');
					// They return a function. Call it providing a callback
					validationinfo(_makeResumeCallback(i, vPos, originaltitle));
					return false;
				}
				// Validators with negative priority perform only minor name corrections
				if (validator.priority < 0) {
					if (validationinfo.title) {
						ui.title = validationinfo.title;
					}
				} else {
					// If upload is disallowed, display dialog here and abort
					if (validationinfo.disallow) {
						// We set this property to keep the original title to display to the user
						validationinfo.originaltitle = originaltitle;
						validationinfo.sourceindex = i;
						// Clear any existing validations
						_results = [];
						_results.push(validationinfo);
						return true;
					}
					// If there's any change, return it
					if (validationinfo.title || validationinfo.description || validationinfo.added_categories || validationinfo.removed_categories ||
						validationinfo.added_templates || validationinfo.removed_templates || validationinfo.license || validationinfo.note) {
						// We set this property to keep the original title to display to the user
						validationinfo.originaltitle = originaltitle;
						// Set source index and save to results
						validationinfo.sourceindex = i;
						_results.push(validationinfo);
						// Skip further validators
						break;
					}
				}
			}
			if (originaltitle != ui.title) {
				// Perform title autocorrection
				_validationParams.sources[i].inputName.val(ui.title);
			}
		}
		return true;
	},
	// Generates an object with all the information of an upload to run the validators
	_getUploadInfoToValidate = function(index) {
		var ui = {title: null, filename: null, description: null, categories: [], templates: [], license: null}, arTestRE;
		if (_validationParams.sources[index].inputName) {
			ui.title = _normalizeTitle($(_validationParams.sources[index].inputName).val());
		}
		if (_validationParams.sources[index].inputFile) {
			ui.filename = $(_validationParams.sources[index].inputFile).val();
		}
		if (_validationParams.sources[index].inputDesc) {
			ui.description = $(_validationParams.sources[index].inputDesc).val();
		}
		if (_validationParams.commonDesc) {
			ui.description += (ui.description ? '\n' : '') + $(_validationParams.commonDesc).val();
		}
		if (ui.description) {
			// Reset regexp match
			_reTemplates.lastIndex = 0;
			// Find templates
			while ((arTestRE = _reTemplates.exec(ui.description)) !== null) {
				ui.templates[ui.templates.length] = _normalizeTitle(arTestRE[1]);
			}
			// Reset regexp match
			_reCategories.lastIndex = 0;
			// Find categories
			while ((arTestRE = _reCategories.exec(ui.description)) !== null) {
				ui.categories[ui.categories.length] = _normalizeTitle(arTestRE[2]);
			}
		}
		if (_validationParams.license) {
			ui.license = $(_validationParams.license).val();
		}
		return ui;
	},
	// Normalizes a MediaWiki title
	_normalizeTitle = function(title) {
		// Sets first character to uppercase, and replaces underscores by spaces
		return title.substr(0,1).toUpperCase() + title.substr(1).replace(_reTitleWhiteSpace, ' ');
	},
	// Sorts the validator list by priority
	_sortValidators = function() {
		var priority, reorder;
		if (_validators.length === 0) {
			return;
		}
		// Check first if they're already ordered, so we don't need to reorder them again if the list of validators hasn't changed
		reorder = false;
		priority = _validators[0];
		for (var i = 1; i < _validators.length; i++) {
			if (_validators[i].priority < priority) {
				reorder = true;
				break;
			}
			priority = _validators[i].priority;
		}
		if (reorder) {
			_validators.sort(_validatorComparePriority);
		}
	},
	// Compares priority between 2 validators. Used as a sort callback function
	_validatorComparePriority = function(a, b) {
		if (a.priority == b.priority) {
			return 0;
		}
		return a.priority > b.priority ? 1 : -1;
	},
	// registers one validator
	_registerSingleValidator = function(validator) {
		if (!validator.name || typeof validator.validate != 'function') return;
		for (var i = 0; i < _validators.length; i++) {
			if (_validators[i].name === validator.name) {
				_validators[i] = validator;
				return;
			}
		}
		_validators[_validators.length] = validator;
	},
	// Registers validators (single or array)
	_registerValidators = function(validators) {
		if (validators instanceof Array) {
			for (var i = 0; i < validators.length; i++) {
				_registerSingleValidator(validators[i]);
			}
		} else {
			_registerSingleValidator(validators);
		}
	},
	/*
	 * Sets the list of messages used in dialogs, etc
	 * */
	_setMessages = function(msgs) {
		if (msgs) {
			_messages = msgs;
		}
	},
	/*
	 * Displays a modal dialog
	 * @param validationresult [object/string]: validation result or string with text to display
	 * */
	_showDlg = function(vi) {
		var body, buttons = {};
		if (typeof vi == 'string') {
			body = $('<div>').text(vi);
			buttons[_getMsg('backtoform')] = _closeDlg;
		} else if (vi.disallow) {
			body = $('<div>').text(_getMsg('disallowed', [vi.originaltitle])).append($('<span>').text(vi.disallow));
			buttons[_getMsg('backtoform')] = _closeDlg;
		} else {
			body = _buildValidationForm(vi);
			if (vi.title || vi.license || vi.description || (vi.added_categories && vi.added_categories.length) ||
				(vi.removed_categories && vi.removed_categories.length) || (vi.added_templates && vi.added_templates.length) ||
				(vi.removed_templates && vi.removed_templates.length)
			) {
				buttons[_getMsg('acceptproposal')] = _acceptProposal;
				buttons[_getMsg('declineproposal')] = _declineProposal;
			} else {
				// If nothing to do, just display the note with no choice to accept/decline
				buttons[_getMsg('continueupload')] = _declineProposal;
			}
			buttons[_getMsg('backtoform')] = _closeDlg;
		}
		_closing = false;
		if (_dlg) {
			_dlg.empty().append(body).dialog('open').dialog('option', {
				height: 'auto',
				position: 'center',
				buttons: buttons
			});
		} else {
			_dlg = $('<div id="UploadValidatorDlg"></div>').append(body).appendTo(document.body).dialog({
				modal: true,
				buttons: buttons,
				title: _getMsg('dialogtitle'),
				width: 750,
				close: function() {
					if (!_closing) {
						_endValidation(false);
					}
				}
			});
		}
	},
	_closeDlg = function() {
		if (_dlg) {
			_dlg.dialog('close');
		}
	},
	_buildValidationForm = function(vi) {
		var $body = $('<div>'), $ul = $('<ul>'), i;
		if (vi.title) {
			$ul.append(_buildUIItem(_getMsg('titlechange', [vi.title]), 'title'));
		}
		if (vi.license) {
			$ul.append(_buildUIItem(_getMsg('licensechange', [vi.license]), 'license'));
		}
		if (vi.description) {
			$ul.append(_buildUIItem(_getMsg('descriptionchange', [vi.description]), 'description'));
		} else {
			if (vi.added_categories) {
				for (i = 0; i < vi.added_categories.length; i++) {
					$ul.append(_buildUIItem(_getMsg('categoryaddchange', [vi.added_categories[i]]), 'category-add-'+i.toString()));
				}
			}
			if (vi.removed_categories) {
				for (i = 0; i < vi.removed_categories.length; i++) {
					$ul.append(_buildUIItem(_getMsg('categoryremchange', [vi.removed_categories[i]]), 'category-rem-'+i.toString()));
				}
			}
			if (vi.added_templates) {
				for (i = 0; i < vi.added_templates.length; i++) {
					$ul.append(_buildUIItem(_getMsg('templateaddchange', [vi.added_templates[i]]), 'template-add-'+i.toString()));
				}
			}
			if (vi.removed_templates) {
				for (i = 0; i < vi.removed_templates.length; i++) {
					$ul.append(_buildUIItem(_getMsg('templateremchange', [vi.removed_templates[i]]), 'template-rem-'+i.toString()));
				}
			}
		}
		if ($ul.children().length) {
			$body.append($('<p>').text(_getMsg('filetypedescr', [vi.originaltitle, vi.filetype])));
			$body.append($ul);
			if (vi.note) {
				$body.append($('<p>').text(_getMsg('note', [vi.note])));
			}
		} else if (vi.note) {
			$body.append($('<p>').text(_getMsg('noteonly', [vi.originaltitle, vi.filetype, vi.note])));
		}
		return $body;
	},
	_buildUIItem = function(text, prop) {
		var $li = $('<li>'), $label = $('<label>'), $input = $('<input type="checkbox" checked="checked">');
		$label.text(text).appendTo($li);
		$input.attr({'name': prop}).prependTo($label);
		return $li;
	},
	/*
	 * Stores on results, in a accepted property, what checkboxes are active on the form
	 * */
	_storeUserChoice = function() {
		var res = _results[_currentIndex], $inputs = _dlg.find('input'), nameparts, field;
		res.accepted = { added_categories: [], removed_categories: [], added_templates: [], removed_templates: [] };
		for (var i = 0; i < $inputs.length; i++) {
			if (!$inputs[i].checked) {
				continue;
			}
			nameparts = $inputs[i].name.split('-');
			if (nameparts[0] == 'title' || nameparts[0] == 'license' || nameparts[0] == 'description') {
				res.accepted[nameparts[0]] = true;
			} else {
				field = nameparts[1] == 'add' ? 'added_' : 'removed_';
				field += nameparts[0] == 'category' ? 'categories' : 'templates';
				res.accepted[field][parseInt(nameparts[2], 10)] = true;
			}
		}
	},
	/*
	 * Accepts the proposed changes. If there are more files to validate, goes to the next one. Otherwise, apply changes
	 * */
	_acceptProposal = function() {
		_storeUserChoice();
		if (_currentIndex < _results.length - 1) {
			_currentIndex++;
			_showDlg(_results[_currentIndex]);
		} else {
			_closing = true;
			_closeDlg();
			_applyChanges();
		}
	},
	/*
	 * Declines the proposed changes. If there are more files to validate, goes to the next one. Otherwise, apply changes
	 * */
	_declineProposal = function() {
		_results[_currentIndex].accepted = { added_categories: [], removed_categories: [], added_templates: [], removed_templates: [] };
		if (_currentIndex < _results.length - 1) {
			_currentIndex++;
			_showDlg(_results[_currentIndex]);
		} else {
			_closing = true;
			_closeDlg();
			_applyChanges();
		}
	},
	/*
	 * Apply changes and calls the validation callback
	 * */
	_applyChanges = function() {
		var commonLicense = null, tmpLicense, currentCommonLicense, res, desc, arTestRE, needsIndividualDescriptions = false, hasValidation;
		// Check license in case we could set a common one
		currentCommonLicense = _validationParams.license.val();
		for (var i = 0; i < _results.length; i++) {
			res = _results[i];
			// We start with the common license
			tmpLicense = currentCommonLicense;
			// If a validation changes license, use that
			if (res.license && res.accepted.license) {
				tmpLicense = res.license;
				// If there are unmodified files, that license won't be changed, so we can't set the common license if it changes for some files
				if (_results.length != _validationParams.sources.length) {
					commonLicense = null;
					break;
				}
			}
			if (commonLicense === null) {
				// First time we pass here: set our current "common" license
				commonLicense = tmpLicense;
			} else if (commonLicense != tmpLicense) {
				// If there are different licenses, we can't specify a common one
				commonLicense = null;
				break;
			}
		}
		// If there's no common license, unset it
		if (commonLicense === null) {
			_validationParams.license.val('');
			needsIndividualDescriptions = true;
		}
		if (_validationParams.commonDesc && _validationParams.commonDesc.val()) {
			if (!needsIndividualDescriptions) {
				// Check if there are template, category or description changes. That will require individual descriptions,
				// so we don't have to keep track of changes in common description and individual descriptions
				for (var ir = 0; ir < _results.length; ir++) {
					res = _results[ir];
					if (res.description) {
						if (res.accepted.description) {
							needsIndividualDescriptions = true;
							break;
						}
					} else {
						// added_* properties aren't checked because they don't alter the common description
						if (res.removed_categories && res.accepted.removed_categories) {
							for (var irc1 = 0; irc1 < res.removed_categories.length; irc1++) {
								if (res.accepted.removed_categories[irc1]) {
									needsIndividualDescriptions = true;
									break;
								}
							}
						}
						if (!needsIndividualDescriptions && res.removed_templates && res.accepted.removed_templates) {
							for (var irt1 = 0; irt1 < res.removed_templates.length; irt1++) {
								if (res.accepted.removed_templates[irt1]) {
									needsIndividualDescriptions = true;
									break;
								}
							}
						}
					}
				}
			}
			if (needsIndividualDescriptions) {
				// In that case, copy the common description to each individual description
				for (var is = 0; is < _validationParams.sources.length; is++) {
					_validationParams.sources[is].inputDesc.val(_validationParams.sources[is].inputDesc.val() + '\n' + _validationParams.commonDesc.val());
				}
				_validationParams.commonDesc.val('');
			}
		}
		for (var ir2 = 0; ir2 < _results.length; ir2++) {
			res = _results[ir2];
			if (res.title) {
				if (res.accepted.title) {
					_validationParams.sources[res.sourceindex].inputName.val(res.title);
				} else {
					_appendToTextField(_validationParams.sources[res.sourceindex].inputDesc, _getMsg('titlechangedeclined', [ res.title ]));
				}
			}
			if (res.license && res.accepted.license && commonLicense === null) {
				_appendToTextField(_validationParams.sources[res.sourceindex].inputDesc, '\n' + _getMsg('licenseInsertText', [ '{{' + res.license + '}}' ]));
			} else if (commonLicense === null && currentCommonLicense) {
				// Restore license for this file if we're clearing the common license
				_appendToTextField(_validationParams.sources[res.sourceindex].inputDesc, '\n' + _getMsg('licenseInsertText', [ '{{' + currentCommonLicense + '}}' ]));
			}
			if (res.description) {
				if (res.accepted.description) {
					_validationParams.sources[res.sourceindex].inputDesc.val(res.description);
				}
			} else {
				if (res.removed_categories) {
					for (var irc = 0; irc < res.removed_categories.length; irc++) {
						if (res.accepted.removed_categories[irc]) {
							// Reset regexp match
							_reCategories.lastIndex = 0;
							// Find categories
							desc = _validationParams.sources[res.sourceindex].inputDesc.val();
							while ((arTestRE = _reCategories.exec(desc)) !== null) {
								if (_normalizeTitle(arTestRE[2]) == res.removed_categories[irc]) {
									desc = desc.substr(0, _reCategories.lastIndex - arTestRE[0].length) + desc.substr(_reCategories.lastIndex);
									_reCategories.lastIndex -= arTestRE[0].length;
								}
							}
							_validationParams.sources[res.sourceindex].inputDesc.val(desc);
						} else {
							_appendToTextField(_validationParams.sources[res.sourceindex].inputDesc, _getMsg('categoryremdeclined', [ res.removed_categories[irc] ]));
						}
					}
				}
				if (res.added_categories) {
					for (var iac = 0; iac < res.added_categories.length; iac++) {
						if (res.accepted.added_categories[iac]) {
							_appendToTextField(_validationParams.sources[res.sourceindex].inputDesc, '[[' + mw.config.get('wgFormattedNamespaces')['14'] + ':' + res.added_categories[iac] + ']]');
						} else {
							_appendToTextField(_validationParams.sources[res.sourceindex].inputDesc, _getMsg('categoryadddeclined', [ res.added_categories[iac] ]));
						}
					}
				}
				if (res.removed_templates) {
					for (var irt = 0; irt < res.removed_templates.length; irt++) {
						if (res.accepted.removed_templates[irt]) {
							// Reset regexp match
							_reTemplates.lastIndex = 0;
							// Find templates
							desc = _validationParams.sources[res.sourceindex].inputDesc.val();
							while ((arTestRE = _reTemplates.exec(desc)) !== null) {
								if (_normalizeTitle(arTestRE[1]) == res.removed_templates[irt]) {
									desc = desc.substr(0, _reTemplates.lastIndex - arTestRE[0].length) + desc.substr(_reTemplates.lastIndex);
									_reCategories.lastIndex -= arTestRE[0].length;
								}
							}
							_validationParams.sources[res.sourceindex].inputDesc.val(desc);
						} else {
							_appendToTextField(_validationParams.sources[res.sourceindex].inputDesc, _getMsg('templateremdeclined', [ res.removed_templates[irt] ]));
						}
					}
				}
				if (res.added_templates) {
					for (var iat = 0; iat < res.added_templates.length; iat++) {
						if (res.accepted.added_templates[iat]) {
							_appendToTextField(_validationParams.sources[res.sourceindex].inputDesc, '{{' + res.added_templates[iat] + '}}');
						} else {
							_appendToTextField(_validationParams.sources[res.sourceindex].inputDesc, _getMsg('templateadddeclined', [ res.added_templates[iat] ]));
						}
					}
				}
			}
		}
		if (commonLicense) {
			// Apply common license
			_validationParams.license.val(commonLicense);
		} else if (commonLicense === null && currentCommonLicense) {
			// Restore license for files not in validation if we're clearing the common license
			for (var is2 = 0; is2 < _validationParams.sources.length; is2++) {
				hasValidation = false;
				for (var jr2 = 0; jr2 < _results.length; jr2++) {
					if (_results[jr2].sourceindex == is2) {
						hasValidation = true;
						break;
					}
				}
				if (!hasValidation) {
					_appendToTextField(_validationParams.sources[i].inputDesc, '\n' + _getMsg('licenseInsertText', [ '{{' + currentCommonLicense + '}}' ]));
				}
			}
		}
		_endValidation(true);
	},
	/*
	 * Appends text to a text field
	 * */
	_appendToTextField = function($field, newtext) {
		var text = $field.val();
		if (newtext) {
			if (text) {
				$field.val(text + newtext);
			} else {
				$field.val(newtext);
			}
		}
	},
	/*
	 * Sends the form when done
	 * */
	_endValidation = function(success) {
		_log('End validation (' + success + ')');
		if (_validationParams.callback) {
			_validationParams.callback(success);
		}
	},
	/*
	 * Gets the message contents
	 * */
	_getMsg = function(msg, vars, htmlencode) {
		var text;
		if (!(msg in _messages)) {
			text = '<' + msg + '>';
		} else {
			text = _messages[msg];
		}
		if (vars) {
			for (var i = 0; i < vars.length; i++) {
				text = text.replace('$' + (i+1).toString(), vars[i]);
			}
		}
		if (htmlencode) {
			text = text.replace(/</g, '&lt;').replace(/>/g, '&gt:').replace(/"/g, '&quot;');
		}
		return text;
	};

	$(_init);

	return {
		registerValidators: _registerValidators,
		setMessages: _setMessages,
		validate: _validate
	};
})(jQuery, mw);

window.UploadValidator.setMessages({
	dialogtitle: 'Validación de subida de archivos',
	disallowed: 'El archivo $1 no puede subirse por el siguiente motivo: ',
	notitle: 'Debes indicar el nombre del archivo destino.',
	nofilename: 'Debes seleccionar un archivo para subir $1.',
	backtoform: 'Cancelar',
	filetypedescr: 'El sistema ha detectado que el archivo $1 es de tipo $2 y propone realizar las siguientes correcciones de forma automática:',
	note: 'También se realiza la siguiente observación: $1',
	noteonly: 'El sistema ha detectado que el archivo $1 es de tipo $2. Se realiza la siguiente observación: $3.',
	titlechange: 'Cambiar el nombre por $1',
	descriptionchange: 'Cambiar la descripción por $1',
	licensechange: 'Cambiar la licencia por $1',
	categoryaddchange: 'Agregar la categoría $1',
	categoryremchange: 'Quitar la categoría $1',
	templateaddchange: 'Agregar la plantilla $1',
	templateremchange: 'Quitar la plantilla $1',
	acceptproposal: 'Subir con los cambios propuestos',
	declineproposal: 'Subir sin realizar cambios',
	continueupload: 'Subir archivo',
	licenseInsertText: '== Licencia ==\n$1',
	titlechangedeclined: '\n<!-- Se ha sugerido el cambio de nombre a $1 pero se ha omitido -->',
	categoryadddeclined: '\n<!-- Se ha sugerido agregar la categoría $1 pero se ha omitido -->',
	templateadddeclined: '\n<!-- Se ha sugerido agregar la plantilla $1 pero se ha omitido -->',
	categoryremdeclined: '\n<!-- Se ha sugerido eliminar la categoría $1 pero se ha omitido -->',
	templateremdeclined: '\n<!-- Se ha sugerido eliminar la plantilla $1 pero se ha omitido -->'
});
// </pre>