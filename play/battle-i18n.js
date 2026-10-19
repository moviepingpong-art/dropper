// battle-i18n.js — モンスター対戦（battle.html）の言葉。monster-i18n.js（window.I18N）のあとに読み込み、各言語の辞書に足す。
//
// 名前・属性・合体の法則の見出し（ruleSame2 など）は monster-i18n.js のものをそのまま使う（図鑑のページと同じ言葉にするため）。
// 足す言語が無いキーは英語、英語にも無ければ日本語（ja の辞書）で出る。キーは ja と en の両方に足すこと。
// play/ と各言語の play/ で**バイト同一**に保つ（tools/make-monster-langs.py が写す）。
(function (global) {
  'use strict';

  var B = {
    ja: {
      bPageTitle: 'モンスター対戦｜図鑑のモンスターで1対1の勝負｜ドロッパーの遊び場',
      bLogo: 'モンスター対戦',
      bSndOn: '♪ 音を出す',
      bSndOff: '♪ 止める',
      bBack: '← 図鑑へ',
      // ---- はじめのルール画面 ----
      bIntroH: 'モンスター対戦のあそびかた',
      bIntroLead: '図鑑のモンスターで、1対1の勝負',
      bRule1: '図鑑から<em>7枚</em>えらぶ。★<em>エース</em>は1枚だけ。ほかの6枚はパワーの合計<em>{cap}まで</em>',
      bRule2: '毎回、手札から<em>1〜3枚を伏せて</em>、2人いっしょに出す。<em>先攻・後攻はなし</em>（同時に出すので、どちらが先でも有利・不利がない）',
      bRule3: '強さ＝パワーの合計 ×<em>合体の法則</em>（相性 +30% など。図鑑のページと同じ法則）',
      bRule4: '強いほうがその回の勝ち。同じ強さなら、すばやさの合計で決める。出したカードは<em>どちらも捨てる</em>。ただし<em>★エースだけは1回、手札に戻る</em>（勝っても負けても）',
      bRule5: '<em>先に3回勝った</em>ほうの勝ち',
      bRule6: '終わったら、相手の守り神に<em>お礼</em>を言う（言わないと、次の1戦は★エースを置けず6枚で戦う）',
      bTip: '💡 3枚出せば強いけれど、手札は7枚だけ。弱い1枚で<b>わざと負けておく</b>のも作戦です',
      bGuardNote: '守り神（人間のカード）は戦いません。強さも比べません。対戦を見守る「立会人」になります',
      bVideo: '▶ 動画で見る（対戦しながら説明）',
      bStart: '対戦をはじめる',
      bClose: '閉じる',
      // ---- 7枚えらぶ ----
      bDeckH: '図鑑から7枚えらぶ',
      bSum: '★エース以外の6枚の合計',
      bZukanH: 'あなたの図鑑（タップで入れる・外す）',
      bGuardH: '守り神（人間のカード）は戦いません。1枚を立会人にできます',
      bGuardSub: '強さはありません。勝ち負けにも関わりません',
      bGuardSet: '立会人にする',
      bGuardOn: '立会人にした',
      bNoGuard: '守り神のカードはまだありません（立会人なしでも遊べます）',
      bAuto: 'おまかせで選ぶ',
      bToBattle: '対戦へ',
      bAceSet: '★にする',
      bAceOn: '★エース',
      bLeft: 'あと{n}枚えらんでください',
      bOver: '6枚の合計が{n}多すぎます。弱いカードにかえるか、強いカードを★エースに',
      bReady: 'そろいました！',
      bReadyNoAce: 'そろいました（★エースは無しでも遊べます）',
      bNoAceNow: '前の対戦でお礼をしなかったので、この1戦は★エースを置けません（6枚で戦います）',
      bOverNoAce: '6枚の合計が{n}多すぎます。弱いカードにかえてください',
      bSumAll: '6枚の合計（★エースなし）',
      bLoading: '図鑑を読んでいます…',
      bFew: '戦えるカードが図鑑に{n}枚あります。対戦には7枚いります。',
      bFewMake: 'モンスターを生みに行く',
      bTrial: 'おためしのカードで遊ぶ',
      bTrialNote: 'おためしのカードです（図鑑には入りません）',
      bTag: { gold: 'GOLD', silver: 'SILVER', bug: 'バグ', fuse: '合体', ai: 'AI' },
      // ---- 対戦 ----
      bOpp: 'あいて：{name}',
      bOppName: 'ゆうと',
      bYou: 'あなた',
      bWitness: '立会人 {name}',
      bNoWitness: '立会人なし',
      bOppGuard: 'アナ・リマさん',
      bRound: '{n}回目',
      bPick: '{n}回目：出すカードを1〜3枚えらんでください',
      bFaded: 'うすい札は前の回に出したカード',
      bPvEmpty: 'えらぶと、ここに強さが出ます',
      bSpd: 'すばやさ {n}',
      bGo: '伏せて出す',
      bGoN: '伏せて出す（{n}枚）',
      bSealed: '伏せました（約束 {h}…）<br>あいてを待っています',
      bOppSealed: '{name}さんも伏せました（約束 {h}…）<br>開きます…',
      bWin: '勝ち！',
      bLose: '負け…',
      bDraw: '引き分け',
      bBySpd: 'すばやさで決めました',
      bTap: 'タップで次へ',
      bHistNone: 'これまでの結果：まだありません',
      bHist: 'これまで：',
      bHWin: '○勝ち',
      bHLose: '×負け',
      bHDraw: '△引分',
      bPower: 'パワー',
      bAce: 'エース',
      bBackMe: '★エースが手札に戻りました（もう戻りません）',
      bBackOpp: '{name}さんの★エースが手札に戻りました',
      bAceIn: '★エース登場！',
      bAceWho: '{name}の★エース',
      bAceDuel: '★エース対決！！',
      bAceDuelSub: 'エースとエースがぶつかる！',
      // ---- 終わり ----
      bYouWin: 'あなたの勝ち',
      bOppWin: '{name}さんの勝ち',
      bEven: '引き分け',
      bRowWin: '勝ち',
      bRowLose: '負け',
      bRowDraw: '引分',
      bOutOpp: '{name}さんの手札がなくなったので、残りの回はあなたの勝ちです',
      bOutMe: 'あなたの手札がなくなったので、残りの回はあいての勝ちです',
      bOppGuardLbl: 'あいての守り神',
      bWatched: 'この対戦を見守ってくれました',
      bThanks: '🙏 {name}、<br>見守ってくれてありがとうございました',
      bThanked: 'お礼が届きました',
      bChain: '🔗 記録を残しました（約束 {n}つ＋お礼 1つ の鎖）',
      bWarn: 'お礼を言わずに閉じると、<b>次の1戦はエースを置けません</b>',
      bSkip: 'お礼をしないで閉じる',
      bSkipped: '記録に「お礼なし」と残りました。<b>次の1戦はエースを置けません</b>',
      bAgain: 'もう一度あそぶ',
      bNote: 'カードの中身はこの端末の中だけで読みます。対戦の記録も、この端末の中だけに残ります',
      bMusic: '♪ 曲：トランペット3重奏（その場で合成）'
    }
  };

  var I = global.I18N || {};
  for (var L in I) {
    var add = {}, k;
    for (k in B.ja) add[k] = B.ja[k];
    if (L !== 'ja' && B.en) for (k in B.en) add[k] = B.en[k];
    if (B[L]) for (k in B[L]) add[k] = B[L][k];
    for (k in add) I[L][k] = add[k];
  }
})(window);
