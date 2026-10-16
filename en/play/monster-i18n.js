// monster-i18n.js — モンスタードロッパーの多言語辞書（window.I18N）
//
// 道具（イベント・予定表・決めごと）の辞書と同じ形。ほかの道具の辞書とは別物（辞書は跨がせない）。
// play/・en/play/・in/play/ の3フォルダで**バイト同一**に保つこと（コミット前のフックが確かめる）。
//
// キーは ja / en / in の3言語すべてに足すこと（片方だけ足さない）。
// ★ 図鑑に入るカードの中身（属性・種類・強さの項目など）は、言語によらず日本語の鍵のまま持つ。
//   画面に出すときだけ、ここの表で各言語の名前に置き換える（どの言語のページでも、同じ図鑑が読めるように）。
//   名前・技・説明など、生まれたときに作る文は、生まれたページの言語のまま残る。
(function (global) {
  'use strict';

  var I18N = {
    ja: {
      pageTitle: 'モンスタードロッパー｜写真からモンスターのカードが生まれる｜ドロッパーの遊び場',
      // ---- 画面（data-i18n）----
      shelf: 'DROPPER PLAYGROUND ／ ドロッパーの遊び場',
      h1a: 'モンスター',
      h1b: 'ドロッパー',
      lead: '身の回りの写真をドロップすると、その写真からモンスターが生まれます。冷蔵庫の中、散歩の景色、机の上、なんでも。文章のファイルや音声のファイルからも生まれます。',
      dropAria: '写真・文章・音声のファイルを選ぶ',
      dropTitle: '写真・文章・音声をドロップ',
      dropHint: '2〜3枚まとめて落とすと<b>合体</b>します。ここを押して選ぶこともできます（写真＝JPEG・PNG・WebP、文章＝.txt・.md、音声＝.mp3・.m4a・.wav・.ogg）',
      aiSwitch: 'AI に写っているものを読ませる（任意）',
      aiSwitchHint: 'オフのときは写真の色だけで生まれ、写真はこの端末から出ません。オンにすると、写っているものから<b>キャラの種類</b>（料理の妖精・けもの・森の精霊・ロボット・街の番人・星の使い・紙の学者・絵から出た子・ドットの子）と、名前・技・図鑑の説明が決まり、食べ物なら料理のミッションも出ます。文章・音声のファイルは、いまは AI に送らず、中身を数えた値だけで生まれます。',
      badge1: 'クレカ不要',
      badge2: '無料枠内なら0円',
      badge3: '取得は約3分',
      keyPlaceholder: 'Gemini の API キーを貼り付け',
      saveKey: '保存',
      keyNote1: 'キーはこの端末だけに保存し、ドロッパーのサーバーには送りません。キーの取り方は ',
      keyNoteLink: '取得ガイド',
      keyNote2: ' へ。',
      aiWarn: '⚠ オンのときは、写真を Google の Gemini に送ります。人の顔や名前が写った写真は使わないでください。',
      aiRetry: 'もう一度試す',
      cardAria: 'モンスターのカード',
      save: 'カードを画像で保存',
      cand: '💍 結婚相手の候補にする',
      again: '別のファイルで',
      dexTitle: '📖 わたしの図鑑',
      clearDex: '図鑑を空にする',
      dexNote: 'カードを押すと大きく見られます。カードの中身はこの PC・スマホの中にだけ保存され、ほかの人には見えません。',
      dexEmpty: 'まだ1体もいません。',
      marryTitle: '💍 結婚と子ども',
      marryNote: '図鑑のカードを押して「結婚相手の候補にする」を選ぶと、ここに入ります。男性カード ♂ と女性カード ♀ を1枚ずつ。1組の夫婦から、子どもは3人まで生まれます。',
      wed: '結婚させる',
      unslot: '選び直す',
      rulesTitle: '🧬 合体の法則（わかっているもの）',
      rule1: '<b>そろい</b>：同じ属性が2つで +20%、3つで +50%',
      rule2: '<b>相性</b>：組み合わせによっては +30%（炎×風「ほのおのたつまき」、水×森「めぐみの雨」など、全部で10組）',
      rule3: '<b>打ち消し</b>：炎×水・炎×森・雷×土が入ると、ほかの法則はぜんぶ効かなくなり、混ぜた中でいちばん強い子の力から1組ごとに15%ずつ削られる。<b>必ず元より弱くなる</b>',
      rule4: '<b>にじ</b>：3つとも違う属性なら +10%',
      rule5: '<b>データの珍しさ</b>：🥇ゴールド（1000枚に1枚）を混ぜると1枚ごとに +25%、🥈シルバー（500枚に1枚）は +10%、⚠バグ個体は +8%。ただしバグ個体が2つ以上だと、合体した子もバグる',
      rule6: '落とす順番は関係ありません',
      rule7: '……ほかにも、まだ見つかっていない法則があるらしい',
      howTitle: 'どうやって生まれるの？',
      how1: '写真のいちばん多い色で、属性（炎・水・森…）が決まります',
      how2: 'AI をオンにすると、写っているものの種類で<b>キャラの種類と体の形</b>が変わります（食べ物なら器の形の料理の妖精、乗り物ならロボット、建物なら家の形の街の番人…）',
      how3: '文章は、長さ・「！」や「？」の多さ・漢字の割合・1文の短さ・改行の多さで、強さと体の形が決まります。音声は、長さ・音の大きさ・低い音と高い音の多さで決まります',
      how4: '写真のデータから<b>発行のたびに違う部分</b>を読み取り、それで体の形・目・模様・強さ・性別を決めます。同じ写真でも、二度と同じ子は生まれません',
      how5: 'どのカードにも、その1枚だけの<b>紋章</b>と、読み取った部分・発行番号が入ります',
      how6: 'カードの画像に、写真・文章・音声の中身とファイル名は入れません',
      how7: '図鑑・結婚・子どもは、この PC・スマホの中にだけ残ります',
      footerBrand: 'ドロッパー',
      footerPolicy: 'プライバシーポリシー（遊び場）',

      // ---- 生まれる子の名前と技（生まれたときの言語のまま図鑑に残る）----
      syl: {
        '炎': ['ヒノ', 'ボル', 'カグ', 'フレ', 'アチ'], '水': ['ミズ', 'アク', 'シズ', 'ポチャ', 'ナミ'], '森': ['モリ', 'リーフ', 'コケ', 'ハッパ', 'ツタ'],
        '雷': ['ピリ', 'ライ', 'ビリ', 'ゴロ', 'ボルト'], '土': ['ドロ', 'イワ', 'ツチ', 'ゴツ', 'スナ'], '風': ['フワ', 'カゼ', 'ソヨ', 'ヒュー', 'クモ'],
        '夢': ['ユメ', 'モモ', 'ポワ', 'キラ', 'ルル'], '闇': ['ヤミ', 'カゲ', 'ヨル', 'ノクス', 'ズズ'], '光': ['ヒカ', 'テラ', 'ルミ', 'アサ', 'ピカ'],
        '鋼': ['ガチ', 'ハガ', 'ネジ', 'カネ', 'ギア']
      },
      tail: ['モン', 'ドン', 'ピー', 'ゴン', 'リン', 'マル', 'ッチ', 'ポン', 'ラ', 'ゾウ'],
      mid: ['', '', 'ポ', 'ロ', 'ン', 'ピ', 'ノ', 'ク'],
      moves: {
        '炎': ['ほのおのしっぽ', 'あったかハグ', 'まっかなくしゃみ', 'たきびダンス'], '水': ['みずでっぽう', 'ぷくぷくあわ', 'なみのりスピン', 'あまやどり'],
        '森': ['はっぱカッター', 'こもれびねむり', 'つるのぶらんこ', 'たねまき'], '雷': ['ぴりぴりタッチ', 'いなずまダッシュ', 'ゴロゴロこえ', 'ひかるツノ'],
        '土': ['どろんこタックル', 'いわのよろい', 'すなけむり', 'ふかいあなほり'], '風': ['つむじかぜ', 'ふわふわ浮く', 'はねのマント', 'そよかぜのうた'],
        '夢': ['ゆめみるビーム', 'きらきらウインク', 'ねむりのこもりうた', 'ほしくず'], '闇': ['かげぬい', 'よふかしパンチ', 'くらやみかくれんぼ', 'つきのささやき'],
        '光': ['まぶしいえがお', 'ひかりのわっか', 'あさひのめざめ', 'てらすライト'], '鋼': ['ネジまわし', 'かちかちガード', 'はがねのずつき', 'ギアチェンジ']
      },
      humanMoves: ['思い出のアルバム', 'はたらく手', 'やさしいことば', 'ねばりづよさ', '家族のきずな', 'ひらめき', 'あさのさんぽ', 'ありがとうの力'],
      fieldMoves: {
        '技術': ['コードの嵐', 'バグたいじ'], '医療': ['いやしの手', 'ねむれる夜'], '農業': ['たねまき', '豊作のおどり'], '海': ['大漁のあみ', 'しおかぜ'],
        '芸術': ['ひらめきの筆', 'こころのうた'], '事務': ['きっちり計算', 'はんこラッシュ'], '教育': ['わかる授業', 'ほめことば'],
        '体を使う': ['ちからしごと', 'あせの結晶'], 'その他': ['はたらく手', 'ありがとうの力']
      },
      // 合体の相性（PAIRS と同じ順）
      pairNames: ['ほのおのたつまき', 'めぐみの雨', 'でんきうなぎ', 'だいちのちから', 'たそがれ', 'ほしぞら', 'でんじしゃく', 'よるのゆめ', 'マグマ', 'あらし'],

      // ---- カードに描く言葉（描くたびにページの言語で出す）----
      types: { '炎': '炎', '水': '水', '森': '森', '雷': '雷', '土': '土', '風': '風', '夢': '夢', '闇': '闇', '光': '光', '鋼': '鋼' },
      stats: { 'たいりょく': 'たいりょく', 'こうげき': 'こうげき', 'まもり': 'まもり', 'すばやさ': 'すばやさ' },
      charas: { '料理': '料理の妖精', '動物': 'けもの', '植物': '森の精霊', '乗り物': 'ロボット', '建物': '街の番人', '空': '星の使い', '書類': '紙の学者', '絵': '絵から出た子', '画面': 'ドットの子', '人間': '人間' },
      animalCharas: { '犬': '犬のけもの', '猫': '猫のけもの', 'うさぎ': 'うさぎのけもの', 'くま': 'くまのけもの', '鳥': '鳥のけもの', '魚': '魚のけもの', '虫': '虫のけもの', 'は虫類': 'は虫類のけもの' },
      typeBadge: '{icon} {type}タイプ',
      bugBadge: '❓ ？？？タイプ',
      power: 'パワー',
      longLife: '🕯 長生きの証',
      bugStamp: '⚠ バグ個体',
      mission: '★ 料理ミッション',
      originChild: '第{gen}世代　父 {f} × 母 {m}',
      originFuse: '合体 ×{n}：{parts}',
      partsSep: '＋',
      originPhoto: '生まれた写真：{motif}',
      charaSep: '　',
      originColor: '写真の色から生まれた',
      birthChild: '{f}と{m}の{n}人目',
      birthFuse: '{n}枚の合体',
      birthFrag: '断片 #{n}：{start}バイト目から{stride}ごと',
      issued: '発行 #{serial}　{birth}',
      brand: 'モンスタードロッパー  dropper-tools.com',
      lifeAvg: '平均{n}',
      lifeAge: '{n}歳',
      lifeKids: '{n}人',
      // 説明の折り返し：char＝1字ずつ（日本語）、word＝語の切れ目で（英語）
      wrapMode: 'char',
      noLineStart: '。、！？」）',
      // 文字化けの演出に使う字（説明の1〜2字・バグ個体の名前と技）
      mojibake: '縺繧繝蜷荳譁鬮莉�',
      keepChars: '。、！？ ',
      sliceUnit: 1,
      minName: 3,

      // ---- 生まれたときに作る文 ----
      descPhoto: '{icon} {type}タイプ。写真のいちばん多い色から生まれた。読み取った部分が違えば、別の子になる。',
      descData: '{icon} {type}タイプ。{src}読み取った部分が違えば、別の子になる。',
      descLife: '{icon} {type}タイプ。{age}年の人生から生まれた。',
      descLongLife: '平均寿命より長く生きた。',
      srcText: '文章の長さや書きぶりから生まれた。',
      srcAudio: '音の大きさや高さから生まれた。',
      srcLife: '人生の長さと、年ごとの幸せから生まれた。',
      originText: '文章から生まれた',
      originAudio: '音から生まれた',
      originLife: '人生の記録から生まれた',
      labelText: '文章',
      labelAudio: '音声',
      labelLife: '人生の記録',
      childDesc: '{f}と{m}の{n}人目の子。',
      childMut: '★突然変異：{what}が両親のどちらとも違う。',
      childHalf: 'ふたりの特徴を半分ずつ受け継いだ。',
      mutEyes: '目の数',
      mutTop: '頭の飾り',
      mutPattern: '模様',
      mutType: '属性',
      unknownName: '？？？？',
      ruleSame3: 'そろい3',
      ruleSame2: 'そろい2',
      rulePair: '相性「{name}」',
      ruleClash: '打ち消し（{a}×{b}）',
      ruleRainbow: 'にじ',
      ruleNight: '★はじまりの夜',
      ruleRare: '{label}×{n}',
      ruleBug: '不安定なデータ×{n}',
      ruleFullBugClash: '★完全バグ（打ち消しで力が出ない）',
      ruleFullBug: '★完全バグ',
      ruleFullBugX2: '★完全バグ ×2',
      ruleSep: '／',
      fuseTailClash: '　→ 打ち消しで、ほかの法則は効かず、いちばん強い子の {pct}% だけ残った',
      fuseTail: '　→ 合計 {total}',
      fuseTailX2: '・×2',
      // 人生の記録（AI が読んだ値から、説明をここで作る）
      ldType: '{icon} {type}タイプ。',
      ldMain: '{inCountry}{age}年を生きた{asJob}',
      ldIn: '{country}で',
      ldJob: '{job}。',
      ldNoJob: '人。',
      ldEdu: '最終学歴は{edu}。',
      ldKids: '子ども{n}人。',
      motifSep: '・',
      eduNone: 'なし|無',

      // ---- 画面の下の一行・帯 ----
      bugMsg: '⚠ バグ個体が生まれた！（16匹に1匹）',
      goldMsg: '🥇 ゴールドカード！（1000枚に1枚）',
      silverMsg: '🥈 シルバーカード！（500枚に1枚）',
      stChild: '👶 {f}と{m}に、{n}人目の子どもが生まれた！',
      stFuse: '🧬 {n}つのデータが合体！ パワー {power}',
      stFuseBug: '⚠ バグ個体が混ざって、合体した子もバグった！',
      statusSep: '　',
      noteSep: '',
      fromDex: '図鑑から開きました。',
      dexAlt: '{name}（{gender}・第{gen}世代）',
      male: '男性',
      female: '女性',
      genTag: '第{gen}世代',
      memOnly: '⚠ この画面ではカードを保存できません（プライベートブラウズなど）。閉じると消えます。',
      keyOk: '✅ キーは保存済みです（入れ直すときは貼り付けて保存）',
      keyNone: 'キーがまだありません。',
      dropNone: '写真・文章（.txt・.md）・音声（.mp3 など）のファイルをドロップしてください。',
      noteMixedKinds: '合体できるのは同じ種類のファイルどうしなので、最初のファイルと同じ種類だけを使いました。',
      noteMax3: '合体できるのは3枚までなので、最初の3枚を使いました。',
      noteHumanMix: '人間のカードと、ほかの写真は合体できないので、最初のファイルと同じほうだけを使いました。',
      noteSameFile: '同じファイルは1枚に数えました。',
      fusing: '🧬 合体しています…',
      hatching: '🥚 たまごが動いています…',
      errPhoto: '読めない写真がありました（HEIC は JPEG に変えてから試してください）。',
      errNoText: '文字の入っていない文章のファイルでした。',
      errNoAudio: 'このブラウザでは音声を読めませんでした。',
      errAudio: '読めない音声のファイルでした（mp3・m4a・wav・ogg で試してください）。',
      errShortAudio: '短すぎる音声でした。',
      errTooBig: '{label}のファイルが大きすぎます（{mb}MB まで）。',
      husband: '夫',
      wife: '妻',
      slotEmpty: '{label}：まだ選んでいません',
      slotFilled: '{label}：{name}',
      kidsCount: '子ども {n}/3',
      kidsMax: '子どもは3人まで',
      haveChild: '👶 子どもを授かる',
      married: '💍 {m} と {f} が結婚しました！',
      notInDex: 'このカードはまだ図鑑に入っていません。',
      clearConfirm: '図鑑のカードと、結婚・子どもの記録をぜんぶ消します。元に戻せません。よろしいですか？',
      marryPick: '男性カードと女性カードを1枚ずつ選んでください。',
      marrySame: '同じカードどうしは結婚できません。',
      marryGender: '男性カードと女性カードの組でないと結婚できません。',
      marryHuman: '人間のカードは、人間のカードどうしでしか結婚できません。',
      marryAlready: '{name} はもう結婚しています。',
      marryParent: '親子どうしは結婚できません。',
      marrySibling: '兄弟姉妹どうしは結婚できません。',

      // ---- AI のようす ----
      aiBusy: 'AI が混み合っていて、答えられませんでした。',
      aiBusyHint: 'すぐにもう一度試すと通ることがあります。何度か続くときは、数分おいてから試してください。',
      aiQuota: 'AI の無料枠の上限に当たりました。',
      aiQuotaHint: '1分ほどおいてから試してください。それでも通らないときは、今日の分を使い切っています。明日また試してください。',
      aiSlow: 'AI の返事が遅すぎたので、待つのをやめました。',
      aiSlowHint: '混んでいるようです。もう一度試すか、少しおいてから試してください。',
      aiNet: 'AI と通信できませんでした。',
      aiNetHint: 'インターネットのつながりを確かめてから、もう一度試してください。',
      aiKey: 'API キーが正しくないようです。',
      aiKeyHint: '上の欄にキーを貼り直してから、もう一度試してください。',
      aiNoKey: 'API キーが保存されていません。',
      aiNoKeyHint: '上の欄にキーを保存してから、もう一度試してください。',
      aiBad: 'AI がうまく答えませんでした。',
      aiBadHint: 'もう一度試してください。',
      aiCode: '（{code}）',
      aiWhatLife: 'AI が人生の記録を読んでいます',
      aiWhatPhoto: 'AI が写真を見ています',
      aiWork: '🤖 {what}… {sec}秒',
      aiWorkSlow: '混んでいると少し時間がかかります。このまま待ってください。',
      aiWorkHint: '名前・技・説明を書いています。終わるとカードが描き変わります。',
      aiReadingLife: '🔍 AI が人生の記録を読んでいます…',
      aiReadingPhoto: '🔍 AI が写真を見ています…',
      aiDoneLife: '✅ AI が人生の記録を読み終えました（{sec}秒）',
      aiDonePhoto: '✅ AI が書き終えました（{sec}秒）',
      aiDoneLifeHint: '名前・仕事・家族をカードに入れました。',
      aiDonePhotoHint: '名前・技・説明と、体の形をカードに入れました。',
      aiNg: '⚠ {msg}カードは色だけで生まれています。',
      aiNgNoKey: '⚠ {msg}いまは色だけで生まれています。',
      aiOffTitle: 'ℹ AI は使っていません',
      aiOffData: '文章・音声のファイルは AI に送らず、中身を数えた値だけで生まれます。',
      aiOffFuse: '合体のときは、写真を何枚も送らないよう AI を使いません。',

      // ---- AI へのお願い（答えの言語はページの言語）----
      // AI が答える選択肢の言葉 → カードの中の鍵（日本語）。日本語のページでは同じ言葉
      aiTypes: { '炎': '炎', '水': '水', '森': '森', '雷': '雷', '土': '土', '風': '風', '夢': '夢', '闇': '闇', '光': '光', '鋼': '鋼' },
      aiKinds: { '料理': '料理', '動物': '動物', '植物': '植物', '乗り物': '乗り物', '建物': '建物', '空': '空', '書類': '書類', '絵': '絵', '画面': '画面' },
      aiAnimals: { '犬': '犬', '猫': '猫', 'うさぎ': 'うさぎ', 'くま': 'くま', '鳥': '鳥', '魚': '魚', '虫': '虫', 'は虫類': 'は虫類' },
      aiFields: { '技術': '技術', '医療': '医療', '農業': '農業', '海': '海', '芸術': '芸術', '事務': '事務', '教育': '教育', '体を使う': '体を使う', 'その他': 'その他' },
      aiItems: { 'ノートPC': 'ノートPC', '本': '本', 'くわ': 'くわ', '聴診器': '聴診器', 'フライパン': 'フライパン', '工具': '工具', '筆': '筆', 'マイク': 'マイク', 'ボール': 'ボール' },
      aiGenders: { 'm': '男性', 'f': '女性' },
      prompt: 'この写真をもとに、ゲームのモンスターを1体考えてください。JSONだけで答えてください。\n' +
        '{"kind":"写っているものの種類。料理・動物・植物・乗り物・建物・空・書類・絵・画面・その他 のどれか1つ（料理＝食べ物・食材・飲み物、乗り物＝乗り物や機械、空＝空・星・月・夜景、書類＝書類・本・文字、絵＝手描きの絵、画面＝パソコンやゲームの画面）","animal":"kind が動物のときだけ、犬・猫・うさぎ・くま・鳥・魚・虫・は虫類・その他 のどれか1つ（たぬき・きつねは犬、ライオン・とらは猫、ハムスターはうさぎ、かえるは は虫類 にまとめる）。動物でなければ null","motif":"写っている主なもの（12字以内）","name":"モンスターの名前（カタカナ3〜7字）","type":"炎・水・森・雷・土・風・夢・闇・光・鋼 のどれか1つ","moves":["技の名前（9字以内）","技の名前（9字以内）"],"desc":"図鑑の説明（子どもにも分かる言葉で60字以内）","mission":"食べ物・食材・冷蔵庫の中が写っていれば、写っている材料で作れる料理を『〜を作ってたおせ！』の形で30字以内。そうでなければ null"}\n' +
        '人が写っていても、その人の顔・見た目・名前・持ち物の文字には触れず、物や景色だけをもとにしてください。',
      // 人生の記録：書かれた文字を読ませる。死因と家庭の暮らしぶりは読ませない（重い内容があり得るため）
      lifePrompt: 'この画像は、人生シミュレーションの「人生の記録」のカードです。書かれている文字を読み取って、JSONだけで答えてください。\n' +
        '{"name":"いちばん大きく書かれた人物の名前（書かれているとおりの文字で、20字以内）","gender":"男性・女性 のどちらか","country":"暮らした国（日本語で10字以内）","job":"最後の仕事（「・引退」などは除いて12字以内）","field":"最後の仕事の分野。技術・医療・農業・海・芸術・事務・教育・体を使う・その他 のどれか1つ","edu":"最終学歴（8字以内）","kids":"子どもの人数（数字だけ。いなければ 0）","item":"その仕事で手に持つ道具。ノートPC・本・くわ・聴診器・フライパン・工具・筆・マイク・ボール・なし のどれか1つ"}\n' +
        '死因・生まれた家庭の暮らしぶり・亡くなった場所は読まず、答えにも入れないでください。',
      // AI の答えの長さの上限（字数）
      clipName: 8,
      clipMotif: 14,
      clipMove: 10,
      clipDesc: 70,
      clipMission: 34,
      clipLifeName: 20,
      clipJob: 12,
      clipCountry: 10,
      clipEdu: 8
    },
    en: {
      pageTitle: 'Monster Dropper | A monster card is born from your photo | Dropper Playground',
      // ---- 画面（data-i18n）----
      shelf: 'DROPPER PLAYGROUND',
      h1a: 'Monster ',
      h1b: 'Dropper',
      lead: 'Drop a photo of anything around you, and a monster is born from it. The inside of your fridge, a view from your walk, your desk, anything. Text files and audio files work too.',
      dropAria: 'Choose a photo, text or audio file',
      dropTitle: 'Drop a photo, text or audio file',
      dropHint: 'Drop 2 or 3 at once and they <b>fuse</b>. You can also tap here to choose (photos = JPEG, PNG, WebP; text = .txt, .md; audio = .mp3, .m4a, .wav, .ogg)',
      aiSwitch: 'Let the AI see what is in the photo (optional)',
      aiSwitchHint: 'When off, the monster is born from the photo\'s colors only, and the photo never leaves this device. When on, what is in the photo decides the <b>kind of creature</b> (Food Fairy, Beast, Forest Spirit, Robot, Town Guardian, Star Messenger, Paper Scholar, Picture Sprite, Pixel Kid), plus its name, moves and collection entry. For food, you also get a cooking mission. Text and audio files are not sent to the AI; they are born only from values counted from their contents.',
      badge1: 'No credit card',
      badge2: 'Free within the free tier',
      badge3: 'About 3 minutes to get',
      keyPlaceholder: 'Paste your Gemini API key',
      saveKey: 'Save',
      keyNote1: 'The key is saved only on this device and never sent to Dropper\'s server. To get a key, see the ',
      keyNoteLink: 'API key guide',
      keyNote2: '.',
      aiWarn: '⚠ When on, photos are sent to Google\'s Gemini. Please don\'t use photos showing people\'s faces or names.',
      aiRetry: 'Try again',
      cardAria: 'Monster card',
      save: 'Save card as image',
      cand: '💍 Make a marriage candidate',
      again: 'Try another file',
      dexTitle: '📖 My Collection',
      clearDex: 'Clear collection',
      dexNote: 'Tap a card to see it large. Cards are stored only on this PC or phone, and nobody else can see them.',
      dexEmpty: 'No monsters yet.',
      marryTitle: '💍 Marriage and Children',
      marryNote: 'Tap a card in your collection and choose "Make a marriage candidate" to put it here. One male card ♂ and one female card ♀. Each couple can have up to 3 children.',
      wed: 'Marry them',
      unslot: 'Choose again',
      rulesTitle: '🧬 Rules of Fusion (known so far)',
      rule1: '<b>Match</b>: two of the same type +20%, three +50%',
      rule2: '<b>Combo</b>: some pairs give +30% (Fire×Wind "Fire Tornado", Water×Forest "Blessed Rain" and more, 10 in all)',
      rule3: '<b>Cancel</b>: if Fire×Water, Fire×Forest or Thunder×Earth is mixed in, every other rule stops working, and 15% per pair is cut from the strongest one\'s power. <b>It always ends up weaker than before</b>',
      rule4: '<b>Rainbow</b>: three different types +10%',
      rule5: '<b>Rare data</b>: each 🥇Gold (1 in 1,000) mixed in +25%, 🥈Silver (1 in 500) +10%, ⚠glitched +8%. But with two or more glitched ones, the fused monster glitches too',
      rule6: 'The order you drop them in doesn\'t matter',
      rule7: '...and there seem to be other rules nobody has found yet',
      howTitle: 'How are they born?',
      how1: 'The most common color in the photo decides the type (Fire, Water, Forest...)',
      how2: 'With the AI on, what is in the photo changes the <b>kind of creature and its body shape</b> (food makes a bowl-shaped Food Fairy, vehicles make Robots, buildings make house-shaped Town Guardians...)',
      how3: 'For text, the length, how many "!" and "?", the share of kanji, how short the sentences are and how many line breaks decide its strength and shape. For audio, the length, loudness, and how much low and high sound there is',
      how4: 'A <b>different part of the data is read each time</b> a card is issued, and that decides the shape, eyes, pattern, stats and gender. Even from the same photo, the same monster is never born twice',
      how5: 'Every card carries its own <b>crest</b>, the part that was read, and an issue number',
      how6: 'The contents and names of your photos, text and audio files are not put into the card image',
      how7: 'Your collection, marriages and children stay only on this PC or phone',
      footerBrand: 'Dropper',
      footerPolicy: 'Privacy Policy (Playground)',

      // ---- 生まれる子の名前と技（表の長さは ja とそろえる）----
      syl: {
        '炎': ['Blaz', 'Flar', 'Embr', 'Pyr', 'Sizz'], '水': ['Aqu', 'Splash', 'Drip', 'Wav', 'Bubb'], '森': ['Leaf', 'Moss', 'Fern', 'Sprout', 'Vin'],
        '雷': ['Zap', 'Volt', 'Bolt', 'Spark', 'Rumbl'], '土': ['Mud', 'Rock', 'Dust', 'Pebbl', 'Grit'], '風': ['Breez', 'Gust', 'Whirl', 'Puff', 'Cloud'],
        '夢': ['Dream', 'Peach', 'Twinkl', 'Fluff', 'Lull'], '闇': ['Shad', 'Gloom', 'Night', 'Nox', 'Murk'], '光': ['Glim', 'Shin', 'Lum', 'Dawn', 'Beam'],
        '鋼': ['Gear', 'Rivet', 'Chrom', 'Cog', 'Clank']
      },
      tail: ['mon', 'don', 'pip', 'gon', 'ling', 'bo', 'chu', 'pon', 'ra', 'zor'],
      mid: ['', '', 'o', 'a', 'i', 'u', 'y', 'e'],
      moves: {
        '炎': ['Flame Tail', 'Warm Hug', 'Red-Hot Sneeze', 'Campfire Dance'], '水': ['Water Gun', 'Bubble Pop', 'Wave Spin', 'Rain Shelter'],
        '森': ['Leaf Cutter', 'Sunbeam Nap', 'Vine Swing', 'Seed Sowing'], '雷': ['Tingle Touch', 'Lightning Dash', 'Rumble Roar', 'Glowing Horn'],
        '土': ['Mud Tackle', 'Rock Armor', 'Dust Cloud', 'Deep Dig'], '風': ['Whirlwind', 'Float Away', 'Feather Cape', 'Breeze Song'],
        '夢': ['Dream Beam', 'Sparkle Wink', 'Sleepy Lullaby', 'Stardust'], '闇': ['Shadow Stitch', 'Night Owl Punch', 'Dark Hide-and-Seek', 'Moon Whisper'],
        '光': ['Dazzling Smile', 'Halo Ring', 'Sunrise Wake', 'Spotlight'], '鋼': ['Screw Twist', 'Clank Guard', 'Steel Headbutt', 'Gear Shift']
      },
      humanMoves: ['Memory Album', 'Working Hands', 'Kind Words', 'Perseverance', 'Family Bond', 'Bright Idea', 'Morning Walk', 'Power of Thanks'],
      fieldMoves: {
        '技術': ['Code Storm', 'Bug Hunt'], '医療': ['Healing Hands', 'Restful Night'], '農業': ['Seed Sowing', 'Harvest Dance'], '海': ['Big Catch', 'Sea Breeze'],
        '芸術': ['Inspired Brush', 'Heart Song'], '事務': ['Exact Sums', 'Stamp Rush'], '教育': ['Clear Lesson', 'Kind Praise'],
        '体を使う': ['Heavy Lifting', 'Honest Sweat'], 'その他': ['Working Hands', 'Power of Thanks']
      },
      pairNames: ['Fire Tornado', 'Blessed Rain', 'Electric Eel', 'Power of the Earth', 'Twilight', 'Starry Sky', 'Electromagnet', 'Night Dream', 'Magma', 'Storm'],

      // ---- カードに描く言葉 ----
      types: { '炎': 'Fire', '水': 'Water', '森': 'Forest', '雷': 'Thunder', '土': 'Earth', '風': 'Wind', '夢': 'Dream', '闇': 'Dark', '光': 'Light', '鋼': 'Steel' },
      stats: { 'たいりょく': 'Stamina', 'こうげき': 'Attack', 'まもり': 'Defense', 'すばやさ': 'Speed' },
      charas: { '料理': 'Food Fairy', '動物': 'Beast', '植物': 'Forest Spirit', '乗り物': 'Robot', '建物': 'Town Guardian', '空': 'Star Messenger', '書類': 'Paper Scholar', '絵': 'Picture Sprite', '画面': 'Pixel Kid', '人間': 'Human' },
      animalCharas: { '犬': 'Dog Beast', '猫': 'Cat Beast', 'うさぎ': 'Rabbit Beast', 'くま': 'Bear Beast', '鳥': 'Bird Beast', '魚': 'Fish Beast', '虫': 'Bug Beast', 'は虫類': 'Reptile Beast' },
      typeBadge: '{icon} {type} type',
      bugBadge: '❓ ??? type',
      power: 'Power',
      longLife: '🕯 Lived Long',
      bugStamp: '⚠ GLITCHED',
      mission: '★ Cooking Mission',
      originChild: 'Gen {gen}  Father {f} × Mother {m}',
      originFuse: 'Fusion ×{n}: {parts}',
      partsSep: ' + ',
      originPhoto: 'Born from: {motif}',
      charaSep: '  ',
      originColor: 'Born from a photo\'s colors',
      birthChild: 'Child #{n} of {f} and {m}',
      birthFuse: 'Fusion of {n}',
      birthFrag: 'Fragment #{n}: from byte {start}, every {stride}',
      issued: 'Issued #{serial}  {birth}',
      brand: 'Monster Dropper  dropper-tools.com',
      lifeAvg: 'avg {n}',
      lifeAge: 'age {n}',
      lifeKids: 'kids {n}',
      wrapMode: 'word',
      noLineStart: '.,!?)',
      mojibake: 'ÃƒÂ©â€™�¤¿',
      keepChars: '.,!? ',
      // 子・合体の名前は、親の名前を sliceUnit 字ずつ切ってつなぐ（英語は1字だと短すぎる）。minName 字に満たなければおしりを足す
      sliceUnit: 2,
      minName: 4,

      // ---- 生まれたときに作る文 ----
      descPhoto: '{icon} {type} type. Born from the most common color in the photo. Read a different part, and a different monster is born.',
      descData: '{icon} {type} type. {src}Read a different part, and a different monster is born.',
      descLife: '{icon} {type} type. Born from a life of {age} years. ',
      descLongLife: 'Lived longer than average.',
      srcText: 'Born from the length and style of the writing. ',
      srcAudio: 'Born from how loud and how high the sound is. ',
      srcLife: 'Born from the length of a life and the happiness of each year. ',
      originText: 'Born from text',
      originAudio: 'Born from sound',
      originLife: 'Born from a life record',
      labelText: 'Text',
      labelAudio: 'Audio',
      labelLife: 'Life record',
      childDesc: 'Child #{n} of {f} and {m}. ',
      childMut: '★Mutation: its {what} differs from both parents.',
      childHalf: 'Inherited half of each parent\'s traits.',
      mutEyes: 'number of eyes',
      mutTop: 'head ornament',
      mutPattern: 'pattern',
      mutType: 'type',
      unknownName: '????',
      ruleSame3: 'Match 3',
      ruleSame2: 'Match 2',
      rulePair: 'Combo "{name}"',
      ruleClash: 'Cancel ({a}×{b})',
      ruleRainbow: 'Rainbow',
      ruleNight: '★The First Night',
      ruleRare: '{label}×{n}',
      ruleBug: 'Unstable data×{n}',
      ruleFullBugClash: '★Total glitch (cancelled, no power)',
      ruleFullBug: '★Total glitch',
      ruleFullBugX2: '★Total glitch ×2',
      ruleSep: ' / ',
      fuseTailClash: '  → Cancelled: no other rule works, only {pct}% of the strongest remains',
      fuseTail: '  → Total {total}',
      fuseTailX2: ', ×2',
      ldType: '{icon} {type} type. ',
      ldMain: 'Lived {age} years{inCountry}{asJob}',
      ldIn: ' in {country}',
      ldJob: ' as {job}. ',
      ldNoJob: '. ',
      ldEdu: 'Education: {edu}. ',
      ldKids: 'Children: {n}. ',
      motifSep: ', ',
      eduNone: '^(none|no|n/a|-|なし|無)$',

      // ---- 画面の下の一行・帯 ----
      bugMsg: '⚠ A glitched monster was born! (1 in 16)',
      goldMsg: '🥇 Gold card! (1 in 1,000)',
      silverMsg: '🥈 Silver card! (1 in 500)',
      stChild: '👶 {f} and {m} had child #{n}!',
      stFuse: '🧬 {n} pieces of data fused! Power {power}',
      stFuseBug: '⚠ A glitched one was mixed in, so the fused monster glitched too!',
      statusSep: '  ',
      noteSep: ' ',
      fromDex: 'Opened from your collection.',
      dexAlt: '{name} ({gender}, gen {gen})',
      male: 'male',
      female: 'female',
      genTag: 'Gen {gen}',
      memOnly: '⚠ Cards can\'t be saved here (private browsing, etc.). They disappear when you close the page.',
      keyOk: '✅ Key saved (to change it, paste a new one and save)',
      keyNone: 'No key yet.',
      dropNone: 'Please drop a photo, a text file (.txt, .md) or an audio file (.mp3 etc.).',
      noteMixedKinds: 'Only files of the same kind can fuse, so only the ones matching the first file were used.',
      noteMax3: 'Up to 3 files can fuse, so the first 3 were used.',
      noteHumanMix: 'Human cards can\'t fuse with other photos, so only the ones matching the first file were used.',
      noteSameFile: 'The same file was counted once.',
      fusing: '🧬 Fusing...',
      hatching: '🥚 The egg is moving...',
      errPhoto: 'A photo couldn\'t be read (for HEIC, convert it to JPEG and try again).',
      errNoText: 'The text file had no text in it.',
      errNoAudio: 'This browser couldn\'t read the audio.',
      errAudio: 'The audio file couldn\'t be read (try mp3, m4a, wav or ogg).',
      errShortAudio: 'The audio was too short.',
      errTooBig: 'That file is too large ({label}: up to {mb} MB).',
      husband: 'Husband',
      wife: 'Wife',
      slotEmpty: '{label}: not chosen yet',
      slotFilled: '{label}: {name}',
      kidsCount: 'Children {n}/3',
      kidsMax: 'Up to 3 children',
      haveChild: '👶 Have a child',
      married: '💍 {m} and {f} got married!',
      notInDex: 'This card isn\'t in your collection yet.',
      clearConfirm: 'This deletes every card in your collection and all marriage and child records. It can\'t be undone. Continue?',
      marryPick: 'Choose one male card and one female card.',
      marrySame: 'A card can\'t marry itself.',
      marryGender: 'Only a male card and a female card can marry.',
      marryHuman: 'Human cards can only marry other human cards.',
      marryAlready: '{name} is already married.',
      marryParent: 'A parent and child can\'t marry.',
      marrySibling: 'Siblings can\'t marry.',

      // ---- AI のようす ----
      aiBusy: 'The AI is busy and couldn\'t answer.',
      aiBusyHint: 'Trying again right away often works. If it keeps happening, wait a few minutes and try again.',
      aiQuota: 'You hit the AI\'s free-tier limit.',
      aiQuotaHint: 'Wait about a minute and try again. If it still fails, today\'s allowance is used up. Please try again tomorrow.',
      aiSlow: 'The AI took too long to answer, so we stopped waiting.',
      aiSlowHint: 'It seems busy. Try again, or wait a little and try again.',
      aiNet: 'Couldn\'t reach the AI.',
      aiNetHint: 'Check your internet connection and try again.',
      aiKey: 'The API key doesn\'t seem to be valid.',
      aiKeyHint: 'Paste your key in the box above again, then try again.',
      aiNoKey: 'No API key is saved.',
      aiNoKeyHint: 'Save your key in the box above, then try again.',
      aiBad: 'The AI didn\'t answer properly.',
      aiBadHint: 'Please try again.',
      aiCode: ' ({code})',
      aiWhatLife: 'The AI is reading the life record',
      aiWhatPhoto: 'The AI is looking at the photo',
      aiWork: '🤖 {what}... {sec}s',
      aiWorkSlow: 'It can take a little longer when busy. Please wait.',
      aiWorkHint: 'Writing the name, moves and description. The card will be redrawn when done.',
      aiReadingLife: '🔍 The AI is reading the life record...',
      aiReadingPhoto: '🔍 The AI is looking at the photo...',
      aiDoneLife: '✅ The AI finished reading the life record ({sec}s)',
      aiDonePhoto: '✅ The AI finished writing ({sec}s)',
      aiDoneLifeHint: 'The name, job and family are now on the card.',
      aiDonePhotoHint: 'The name, moves, description and body shape are now on the card.',
      aiNg: '⚠ {msg} The card was born from colors only.',
      aiNgNoKey: '⚠ {msg} For now it was born from colors only.',
      aiOffTitle: 'ℹ The AI is not used',
      aiOffData: 'Text and audio files are not sent to the AI; they are born only from values counted from their contents.',
      aiOffFuse: 'When fusing, the AI is not used, so that several photos are not sent.',

      // ---- AI へのお願い（英語で答えてもらう）----
      aiTypes: { '炎': 'fire', '水': 'water', '森': 'forest', '雷': 'thunder', '土': 'earth', '風': 'wind', '夢': 'dream', '闇': 'dark', '光': 'light', '鋼': 'steel' },
      aiKinds: { '料理': 'food', '動物': 'animal', '植物': 'plant', '乗り物': 'vehicle', '建物': 'building', '空': 'sky', '書類': 'document', '絵': 'drawing', '画面': 'screen' },
      aiAnimals: { '犬': 'dog', '猫': 'cat', 'うさぎ': 'rabbit', 'くま': 'bear', '鳥': 'bird', '魚': 'fish', '虫': 'insect', 'は虫類': 'reptile' },
      aiFields: { '技術': 'tech', '医療': 'medical', '農業': 'farming', '海': 'sea', '芸術': 'arts', '事務': 'office', '教育': 'education', '体を使う': 'physical', 'その他': 'other' },
      aiItems: { 'ノートPC': 'laptop', '本': 'book', 'くわ': 'hoe', '聴診器': 'stethoscope', 'フライパン': 'frying pan', '工具': 'tools', '筆': 'brush', 'マイク': 'microphone', 'ボール': 'ball' },
      aiGenders: { 'm': 'male', 'f': 'female' },
      prompt: 'Based on this photo, invent one monster for a game. Answer with JSON only, in English.\n' +
        '{"kind":"what kind of thing is in the photo: exactly one of food, animal, plant, vehicle, building, sky, document, drawing, screen, other (food = food, ingredients or drinks; vehicle = vehicles or machines; sky = sky, stars, moon or night views; document = papers, books or writing; drawing = a hand-drawn picture; screen = a computer or game screen)","animal":"only when kind is animal: exactly one of dog, cat, rabbit, bear, bird, fish, insect, reptile, other (count raccoon dogs and foxes as dog, lions and tigers as cat, hamsters as rabbit, frogs as reptile). Otherwise null","motif":"the main thing in the photo (up to 20 characters)","name":"the monster\'s name (one made-up word, 4 to 10 letters)","type":"exactly one of fire, water, forest, thunder, earth, wind, dream, dark, light, steel","moves":["move name (up to 16 characters)","move name (up to 16 characters)"],"desc":"collection entry (words a child can understand, up to 110 characters)","mission":"if food, ingredients or the inside of a fridge are shown, a dish that can be made from them, in the form \'Cook ... to win!\' (up to 40 characters). Otherwise null"}\n' +
        'Even if people are in the photo, do not mention their faces, looks, names or any writing on their belongings; base it only on objects and scenery.',
      lifePrompt: 'This image is a "life record" card from a life simulation. Read the text written on it and answer with JSON only. Write every value in English (translate if the card is in another language), except the name.\n' +
        '{"name":"the person\'s name written largest (exactly as written, up to 20 characters)","gender":"either male or female","country":"the country they lived in (up to 20 characters)","job":"their last job (without words like \'retired\', up to 24 characters)","field":"the field of that last job: exactly one of tech, medical, farming, sea, arts, office, education, physical, other","edu":"highest education (up to 20 characters)","kids":"number of children (digits only; 0 if none)","item":"a tool held in that job: exactly one of laptop, book, hoe, stethoscope, frying pan, tools, brush, microphone, ball, none"}\n' +
        'Do not read the cause of death, the circumstances of the family they were born into, or the place of death, and do not include them in the answer.',
      clipName: 12,
      clipMotif: 24,
      clipMove: 18,
      clipDesc: 130,
      clipMission: 48,
      clipLifeName: 24,
      clipJob: 24,
      clipCountry: 20,
      clipEdu: 20
    },
    in: {}
  };

  function dict() { return I18N[global.LANG] || I18N.ja; }
  // 文言。{name} を vars の値で置き換える。その言語に無ければ ja、ja にも無ければ鍵そのもの
  function t(key, vars) {
    var d = dict();
    var s = (key in d) ? d[key] : ((key in I18N.ja) ? I18N.ja[key] : key);
    if (vars) { for (var k in vars) { s = String(s).split('{' + k + '}').join(vars[k]); } }
    return s;
  }
  // 表や配列のまま取り出す（名前の音・技・属性の名前など）
  function data(key) {
    var d = dict();
    return (key in d) ? d[key] : I18N.ja[key];
  }

  // data-i18n 属性を持つ要素に文言を流し込む。data-i18n-attr があればその属性に、なければテキストに。
  // data-i18n-html は、この辞書の中の <b> だけを効かせたいところ（辞書は自前の固定文なので、そのまま入れてよい）
  function applyDom() {
    document.title = t('pageTitle');
    // <html lang> を表示言語に合わせる。in が 'en-IN' なのは sitemap の hreflang に合わせているため
    try {
      document.documentElement.lang = (global.LANG === 'en') ? 'en' : (global.LANG === 'in') ? 'en-IN' : 'ja';
    } catch (e) {}
    var els = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i], key = el.getAttribute('data-i18n'), attr = el.getAttribute('data-i18n-attr');
      if (attr) el.setAttribute(attr, t(key));
      else if (el.hasAttribute('data-i18n-html')) el.innerHTML = t(key);
      else el.textContent = t(key);
    }
    // 周知サイトの同じ言語の版へ送る（en の人を ja のページへ飛ばさない）
    var pre = (global.LANG === 'en') ? '/en/' : (global.LANG === 'in') ? '/in/' : '/';
    var km = document.getElementById('keyMoreLink');
    if (km) km.href = 'https://dropper-tools.com' + pre + 'apikey.html';
    var home = document.getElementById('homeLink');
    if (home) home.href = 'https://dropper-tools.com' + pre;
    var pol = document.getElementById('policyLink');
    if (pol) pol.href = pre + 'privacy.html#play';
    // 言語の切り替え：今の言語に印をつける
    var ls = document.querySelectorAll('.langs a[data-lang]');
    for (var j = 0; j < ls.length; j++) ls[j].classList.toggle('active', ls[j].getAttribute('data-lang') === (global.LANG || 'ja'));
    document.documentElement.classList.add('i18n-ready');
  }

  global.I18N = I18N;
  global.t = t;
  global.tdata = data;
  global.applyI18n = applyDom;
})(window);
