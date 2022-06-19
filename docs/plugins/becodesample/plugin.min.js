tinymce.PluginManager.add("becodesample", function (editor, url) {
    let pluginName = "Code sample";

    // check if the node is a "BeCodeSample" block
    let isBeCodeSample = function (node) {
        return node && node.nodeName === 'PRE' && node.firstChild && node.firstChild.nodeName === 'CODE';
    };

    // check if the selection is a "BeCodeSample" block
    let isBeCodeSampleSelection = function () {
        if (editor.selection) {
            let node = editor.selection.getNode();
            return node.nodeName === 'PRE' && node.firstChild && node.firstChild.nodeName === 'CODE';
        }
        return false;
    };

    // get selected "BeCodeSample" block
    let getSelectedBeCodeSample = function () {
        if (editor.selection) {
            let node = editor.selection.getNode();
            if (node.nodeName === 'PRE' && node.firstChild && node.firstChild.nodeName === 'CODE') {
                return node;
            }
        }
        return null;
    };

    // get selected "BeCodeSample" code
    let getCurrentCode = function () {
        let node = getSelectedBeCodeSample();
        if (node) {
            let childNode = node.firstChild;
            return childNode.textContent;
        }

        return '';
    };

    // get language list
    let getLanguages = function () {
        let languages = [
            {
                text: 'Auto',
                value: 'auto'
            }
        ];

        // get HighLight.js comoon language list，
        let hightLightJsLanguages = hljs.listLanguages();

        // get name
        let hightLightJsLanguageName = {};
        hightLightJsLanguages.forEach(function(lang) {
            let l = hljs.getLanguage(lang);
            hightLightJsLanguageName[lang] = l.name;
        });

        // sort by name
        hightLightJsLanguages.sort(function(a, b){
            let x = hightLightJsLanguageName[a].toLowerCase();
            let y = hightLightJsLanguageName[b].toLowerCase();
            if (x < y) return -1;
            if (x > y) return 1;
            return 0;
        });

        hightLightJsLanguages.forEach(function(lang) {
            languages.push({
                text: hightLightJsLanguageName[lang],
                value: lang,
            });
        });

        return languages;
    };

    // default language as: auto
    let getDefaultLanguage = function () {
        return 'auto';
    };

    // get current selected code's language
    let getCurrentLanguage = function () {
        let node = getSelectedBeCodeSample();
        if (node) {
            let matches = node.firstChild.className.match(/language-(\w+)/);
            if (matches) {
                return matches[1];
            }
        }

        return getDefaultLanguage();
    };

    // insert code to editor
    let insertBeCodeSample = function (language, code) {
        if (!code) return;
        editor.undoManager.transact(function () {
            code = tinymce.util.Tools.resolve('tinymce.dom.DOMUtils').DOM.encode(code);
            let node = getSelectedBeCodeSample();
            if (node) {
                // edit
                let childNode = node.firstChild;

                if (language === 'auto') {
                    editor.dom.setAttrib(childNode, 'class', '');
                } else {
                    editor.dom.setAttrib(childNode, 'class', 'language-' + language);
                }

                childNode.innerHTML = code;

                // hight light code
                hljs.highlightElement(childNode);

                editor.selection.select(node);

            } else {
                // insert
                let html = '<pre><code id="__new"' + (language === 'auto' ? '' : (' class="language-' + language + '"')) + '>' + code + '</code></pre>';
                editor.insertContent(html);
                editor.selection.select(editor.$('#__new').removeAttr('id')[0]);
            }
        });
    };

    var open = function () {
        let languages = getLanguages();
        let currentLanguage = getCurrentLanguage();
        let currentCode = getCurrentCode();
        editor.windowManager.open({
            title: 'Insert/Edit Code Sample',
            size: 'large',
            body: {
                type: 'panel',
                items: [
                    {
                        type: 'selectbox',
                        name: 'language',
                        label: 'Language',
                        items: languages
                    },
                    {
                        type: 'textarea',
                        name: 'code',
                        label: 'Code view'
                    }
                ]
            },
            buttons: [
                {
                    type: 'cancel',
                    name: 'cancel',
                    text: 'Cancel'
                },
                {
                    type: 'submit',
                    name: 'save',
                    text: 'Save',
                    primary: true
                }
            ],
            initialData: {
                language: currentLanguage,
                code: currentCode
            },
            onSubmit: function (api) {
                let data = api.getData();
                insertBeCodeSample(data.language, data.code);
                api.close();
            }
        });
    };

    editor.on('PreProcess', function (e) {
        editor.$('pre[contenteditable=false]', e.node).filter(function (key, el) {
            return isBeCodeSample(el);
        }).each(function (key, el) {
            editor.$(el).removeAttr('contentEditable');

            let code = el.textContent;

            let childNode = el.firstChild;
            editor.$(childNode).empty();
            childNode.textContent = code;
        });
    });

    // when set editor content
    editor.on('SetContent', function () {
        let unprocessedCodeSamples = editor.$('pre').filter(function (key, el) {
            return isBeCodeSample(el);
        }).filter(function (key, el) {
            return el.contentEditable !== 'false';
        });

        if (unprocessedCodeSamples.length) {
            editor.undoManager.transact(function () {
                unprocessedCodeSamples.each(function (idx, el) {
                    editor.$(el).find('br').each(function (key, el) {
                        el.parentNode.replaceChild(editor.getDoc().createTextNode('\n'), el);
                    });
                    el.contentEditable = 'false';

                    // hight light code
                    let childNode = el.firstChild;
                    childNode.innerHTML = editor.dom.encode(childNode.textContent);
                    hljs.highlightElement(childNode);

                    el.className = editor.$.trim(el.className);
                });
            });
        }
    });

    // add button
    editor.ui.registry.addToggleButton('becodesample', {
        icon: 'code-sample',
        tooltip: 'Insert/edit code sample',
        onAction: open,
        onSetup: function (api) {
            let nodeChangeHandler = function () {
                api.setActive(isBeCodeSampleSelection());
            };
            editor.on('NodeChange', nodeChangeHandler);
            return function () {
                return editor.off('NodeChange', nodeChangeHandler);
            };
        }
    });

    // add menu
    editor.ui.registry.addMenuItem('becodesample', {
        icon: 'code-sample',
        text: 'Code sample...',
        onAction: open
    });

    // double click code block, show becodesample dialog
    editor.on('dblclick', function (e) {
        let el = e.target;
        let node = editor.$(el).closest("pre");
        if (node.length > 0 && isBeCodeSample(node[0])) {
            open();
        }
    });

    return {
        getMetadata: function () {
            return {
                name: pluginName
            };
        }
    };
});
