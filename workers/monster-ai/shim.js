// 辞書（play/monster-i18n.js）は window に書き込む作り。Worker には window が無いので、先に用意しておく
globalThis.window = globalThis;
