import { h, Component } from 'preact';
import CodeMirror from '../CodeMirror';

import 'codemirror/addon/edit/matchbrackets.js';
import 'codemirror/addon/edit/matchtags.js';
import 'codemirror/addon/edit/closebrackets.js';
import 'codemirror/addon/edit/closetag.js';
import 'codemirror/addon/comment/comment.js';
import 'codemirror/addon/fold/foldcode.js';
import 'codemirror/addon/fold/foldgutter.js';
import 'codemirror/addon/fold/xml-fold.js';
import 'codemirror/addon/fold/indent-fold.js';
import 'codemirror/addon/fold/comment-fold.js';
import 'codemirror/addon/fold/brace-fold.js';
import 'codemirror/addon/hint/show-hint.js';
import 'codemirror/addon/hint/javascript-hint.js';
import 'codemirror/addon/hint/xml-hint.js';
import 'codemirror/addon/hint/html-hint.js';
import 'codemirror/addon/hint/css-hint.js';
import 'codemirror/addon/selection/active-line.js';
import 'codemirror/addon/search/searchcursor.js';
import 'codemirror/addon/search/search.js';
import 'codemirror/addon/dialog/dialog.js';
import 'codemirror/addon/search/jump-to-line.js';

import 'codemirror/mode/xml/xml.js';
import 'codemirror/mode/css/css.js';
import 'codemirror/mode/javascript/javascript.js';
import 'codemirror/mode/htmlmixed/htmlmixed.js';
import 'codemirror/keymap/sublime.js';
import 'codemirror/keymap/vim.js';
import 'code-blast-codemirror/code-blast.js';

import emmet from '@emmetio/codemirror-plugin';
import { prettify } from '../utils';

import '../lib/monaco/monaco.bundle';
import '../lib/monaco/monaco.css';

emmet(CodeMirror);
window.MonacoEnvironment = {
	getWorkerUrl(moduleId, label) {
		let MonacoWorker;

		switch (label) {
			case 'html':
				return 'lib/monaco/workers/html.worker.bundle.js';
			case 'json':
				return 'lib/monaco/workers/json.worker.bundle.js';
			case 'css':
				return 'lib/monaco/workers/css.worker.bundle.js';
			case 'typescript':
			case 'javascript':
				return 'lib/monaco/workers/ts.worker.bundle.js';
			default:
				return 'lib/monaco/workers/editor.worker.bundle.js';
		}
	}
};

export default class CodeEditor extends Component {
	componentDidMount() {
		this.initEditor();
	}
	shouldComponentUpdate(nextProps) {
		if (nextProps.prefs !== this.props.prefs) {
			const { prefs } = nextProps;

			this.instance.setOption('indentWithTabs', prefs.indentWith !== 'spaces');
			this.instance.setOption(
				'blastCode',
				prefs.isCodeBlastOn ? { effect: 2, shake: false } : false
			);
			this.instance.setOption('theme', prefs.editorTheme);

			this.instance.setOption('indentUnit', +prefs.indentSize);
			this.instance.setOption('tabSize', +prefs.indentSize);

			this.instance.setOption('keyMap', prefs.keymap);
			this.instance.setOption('lineWrapping', prefs.lineWrap);
			this.instance.setOption('lineWrapping', prefs.autoCloseTags);

			this.instance.refresh();
		}

		return false;
	}
	setModel(model) {
		this.instance.swapDoc
			? this.instance.swapDoc(model)
			: this.instance.setModel(model);
	}
	setValue(value) {
		this.instance.setValue
			? this.instance.setValue(value)
			: this.instance.setModel(model);
	}
	getValue() {
		return this.instance.getValue();
	}
	saveViewState() {
		if (this.props.mode === 'monaco') {
			return this.instance.saveViewState();
		}
	}
	restoreViewState(state) {
		if (this.props.mode === 'monaco') {
			this.instance.restoreViewState(state);
		}
	}

	refresh() {
		this.instance.refresh ? this.instance.refresh() : this.instance.layout();
	}
	focus() {
		this.instance.focus();
	}

	initEditor() {
		const { options, prefs } = this.props;
		if (this.props.mode === 'monaco') {
			this.instance = monaco.editor.create(this.textarea, {
				language: 'javascript',
				roundedSelection: false,
				scrollBeyondLastLine: false,
				theme: 'vs-dark',
				fontSize: prefs.fontSize,
				minimap: {
					enabled: false
				},
				wordWrap: 'on',
				fontLigatures: true,
				automaticLayout: true
			});
			window.monacoInstance = this.instance;
			this.instance.onDidChangeModelContent(this.props.onChange);
			setTimeout(() => {
				// this.instance.layout();
			}, 1000);
		} else {
			this.instance = CodeMirror.fromTextArea(
				this.textarea.querySelector('textarea'),
				{
					mode: options.mode,
					lineNumbers: true,
					lineWrapping: !!prefs.lineWrap,
					autofocus: options.autofocus || false,
					autoCloseBrackets: true,
					autoCloseTags: !!prefs.autoCloseTags,
					matchBrackets: true,
					matchTags: options.matchTags || false,
					tabMode: 'indent',
					keyMap: prefs.keyMap || 'sublime',
					theme: prefs.editorTheme || 'monokai',
					lint: !!options.lint,
					tabSize: +prefs.indentSize || 2,
					indentWithTabs: prefs.indentWith !== 'spaces',
					indentUnit: +prefs.indentSize,
					foldGutter: true,
					styleActiveLine: true,
					gutters: options.gutters || [],
					// cursorScrollMargin: '20', has issue with scrolling
					profile: options.profile || '',
					extraKeys: {
						Up: function(editor) {
							// Stop up/down keys default behavior when saveditempane is open
							// if (isSavedItemsPaneOpen) {
							// return;
							// }
							CodeMirror.commands.goLineUp(editor);
						},
						Down: function(editor) {
							// if (isSavedItemsPaneOpen) {
							// return;
							// }
							CodeMirror.commands.goLineDown(editor);
						},
						'Shift-Tab': function(editor) {
							CodeMirror.commands.indentAuto(editor);
						},
						'Shift-Ctrl-F': function(editor) {
							if (options.prettier) {
								prettify({
									content: editor.getValue(),
									type: options.prettierParser
								}).then(formattedCode => editor.setValue(formattedCode));
							}
						},
						Tab: function(editor) {
							if (options.emmet) {
								const didEmmetWork = editor.execCommand(
									'emmetExpandAbbreviation'
								);
								if (didEmmetWork === true) {
									return;
								}
								const input = $('[data-setting=indentWith]:checked');
								if (
									!editor.somethingSelected() &&
									(!prefs.indentWith || prefs.indentWith === 'spaces')
								) {
									// softtabs adds spaces. This is required because by default tab key will put tab, but we want
									// to indent with spaces if `spaces` is preferred mode of indentation.
									// `somethingSelected` needs to be checked otherwise, all selected code is replaced with softtab.
									CodeMirror.commands.insertSoftTab(editor);
								} else {
									CodeMirror.commands.defaultTab(editor);
								}
							}
						},
						Enter: 'emmetInsertLineBreak'
					}
				}
			);
			this.instance.on('focus', editor => {
				if (typeof this.props.onFocus === 'function')
					this.props.onFocus(editor);
			});
			this.instance.on('change', this.props.onChange);
			this.instance.addKeyMap({
				'Ctrl-Space': 'autocomplete'
			});
			this.instance.on('inputRead', (editor, input) => {
				// Process further If this has autocompletition on and also the global
				// autocomplete setting is on.
				if (
					!this.props.options.noAutocomplete &&
					this.props.prefs.autoComplete
				) {
					if (
						input.origin !== '+input' ||
						input.text[0] === ';' ||
						input.text[0] === ',' ||
						input.text[0] === ' '
					) {
						return;
					}
					CodeMirror.commands.autocomplete(editor, null, {
						completeSingle: false
					});
				}
			});
		}

		// this.props.onCreation(this.instance);
	}

	render() {
		return (
			<div ref={el => (this.textarea = el)} style="width:100%;height:100%;">
				{this.props.mode === 'monaco' ? null : <textarea />}
			</div>
		);
	}
}
