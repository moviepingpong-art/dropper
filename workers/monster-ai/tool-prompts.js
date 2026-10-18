// イベントドロッパー・予定表ドロッパーの頼み文（ツールのページからは受け取らない。ここが唯一の置き場）
// 2026-10-18 に dropper-app の calendar/app.js（runAiRecheck_・DROPPER_TYPES の aiHint）と
// schedule/schedule-ai.js から移した。そのときの違いは2つだけ：
//   ・イベントは OCR の文字ではなくファイルそのものを読ませるので「次のテキストから」→「添付の要項（チラシ）から」
//   ・JSON で答えさせる設定（json_object）は配列を返せないので、予定表は {"items":[…]} で返させる
// 頼み文を直したら、この Worker を出し直す（README）

// スポーツ大会は sports、ほかの種類は general に、種類ごとの一文（HINTS）を {HINT} に入れる
export const EVENT = {
  "sports": {
    "ja": "あなたはスポーツ大会の要項から情報を抽出するアシスタントです。添付の要項から、実際に試合が行われる開催日・大会名・会場・住所・開会式時刻・試合形式・申込締切・競技種目を読み取り、JSONのみを返してください（前置き・説明・コードフェンスは不要）。開催日は YYYY-MM-DD の配列。練習日・受付日・申込締切日は開催日に含めないこと。schedule は kaisai_dates の各日付に対応する要素を必ず1件ずつ作り、date は kaisai_dates と同じ YYYY-MM-DD 形式にすること。events には、その日に行われる試合形式・競技方法・種目（例：トーナメント方式、予選リーグ、優勝決定戦、個人戦、団体戦、◯◯の部 など）を必ず入れること。1日開催の場合も、要項に競技方法・試合形式・種目の記載があれば、その内容を schedule の events に必ず入れること（要項本文の「競技方法」「試合方法」「試合内容」「試合形式」などの項目を必ず参照する）。その日の種目がどうしても判断できないときのみ events を空文字にしてよいが、要素自体は省略しないこと。値が不明な項目は空文字または空配列。\nsport は競技種目で、要項に書かれている競技名を簡潔な日本語で1つ答えること（例：卓球、バドミントン、バレーボール、サッカー、剣道）。複数競技の大会なら主要なものを1つ、判断できなければ空文字。\nformat_label は、その競技で「試合形式」に相当する項目の自然な見出し名（例：卓球なら「試合形式」、陸上なら「実施種目」、駅伝なら「区間」、武道なら「部門・階級」）。判断できなければ空文字。\nkey_info は、この大会に参加するにあたって参加者が知っておくべき重要な情報を、要項から重要な順に最大5件抜き出した配列。各要素は {\"label\":\"短い見出し\",\"text\":\"内容\"} の形。label は「参加資格」「参加費」「申込締切」「エントリー制限」「持ち物」「駐車場」「安全・注意」「表彰」など内容に合った簡潔な見出し。text はその具体的な内容を参加者が読んで分かるよう簡潔にまとめる。参加資格・出場制限・参加費・支払期限なども、要項に記載があり重要と判断すれば key_info に含めること。重要な情報が無ければ空配列。最大5件を厳守し、些末な事務的記述は省く。\nスキーマ: {\"taikai_mei\":\"\",\"kaisai_dates\":[],\"kaijo\":\"\",\"kaijo_jusho\":\"\",\"kaikai_jikan\":\"\",\"shiai_keishiki\":\"\",\"shimekiri\":\"\",\"schedule\":[{\"date\":\"\",\"events\":\"\"}],\"sport\":\"\",\"format_label\":\"\",\"key_info\":[{\"label\":\"\",\"text\":\"\"}]}",
    "en": "You are an assistant that extracts information from sports event guidelines. From the attached guidelines, read the actual competition date(s), event name, venue, address, opening ceremony time, match format, entry deadline, and sport, and return JSON only (no preamble, explanation, or code fences). kaisai_dates is an array in YYYY-MM-DD. Do not include practice days, reception days, or the entry deadline in kaisai_dates. schedule must have exactly one element per date in kaisai_dates; date must be the same YYYY-MM-DD format as kaisai_dates. events must contain the match format / competition method / categories held that day (e.g. knockout, round-robin, final round, singles, team event, division names). For a one-day event too, if the guidelines state the competition method / match format / categories, put them in schedule events (always refer to items such as competition method, match format, format, event details). Only leave events as an empty string if the categories for that day truly cannot be determined, but never omit the element itself. Use an empty string or empty array for unknown values.\nsport is the sport; answer with one concise sport name in English (e.g. Table Tennis, Badminton, Volleyball, Soccer, Kendo). For a multi-sport event, give the main one; empty string if it cannot be determined.\nformat_label is the natural heading for the item corresponding to match format for that sport (e.g. Format for table tennis, Events for athletics, Legs for a road relay, Division/Class for martial arts). Empty string if it cannot be determined.\nkey_info is an array of up to 5 items of the most important information a participant should know, taken from the guidelines in order of importance. Each element is {\"label\":\"short heading\",\"text\":\"content\"}. label is a concise heading matching the content, such as Eligibility, Entry fee, Entry deadline, Entry limit, What to bring, Parking, Safety, Awards. text summarizes the specific content clearly for a participant. Also include eligibility, entry restrictions, entry fees, and payment deadlines in key_info if they are stated and important. Empty array if there is none. Strictly keep to a maximum of 5, and omit trivial administrative details.\nSchema: {\"taikai_mei\":\"\",\"kaisai_dates\":[],\"kaijo\":\"\",\"kaijo_jusho\":\"\",\"kaikai_jikan\":\"\",\"shiai_keishiki\":\"\",\"shimekiri\":\"\",\"schedule\":[{\"date\":\"\",\"events\":\"\"}],\"sport\":\"\",\"format_label\":\"\",\"key_info\":[{\"label\":\"\",\"text\":\"\"}]}"
  },
  "general": {
    "ja": "あなたはイベントの案内チラシ（コンサート・発表会・展示会・個展・講演会・セミナー・祭り・地域の催し等）から情報を抽出するアシスタントです。添付のチラシから、開催日・イベント名・会場・住所・開始時刻・申込や予約の締切・各日の内容を読み取り、JSONのみを返してください（前置き・説明・コードフェンスは不要）。開催日は YYYY-MM-DD の配列。会期・期間で開催されるイベント（展示会・個展など）は、初日と最終日を kaisai_dates に入れること。締切日は開催日に含めないこと。schedule は kaisai_dates の各日付に対応する要素を必ず1件ずつ作り、date は同じ YYYY-MM-DD 形式にすること。events にはその日の内容・プログラム（例：◯◯公演、上映会、体験コーナー、ギャラリートーク など）を入れること。どうしても判断できないときのみ events を空文字にしてよいが、要素自体は省略しないこと。kaikai_jikan は開場・開演・開始時刻など（例：「開場17:30 開演18:00」）。不明なら空文字。shimekiri は申込・予約の締切（あれば）。無ければ空文字。sport は必ず空文字にすること。format_label は各日の内容欄に付ける自然な見出し（例：「内容」「プログラム」「上演内容」）。判断できなければ空文字。\nkey_info は、来場者・参加者が知っておくべき重要な情報を、チラシから重要な順に最大5件抜き出した配列。各要素は {\"label\":\"短い見出し\",\"text\":\"内容\"} の形。label は「入場料」「チケット」「出演」「対象」「定員」「申込方法」「駐車場」「雨天時」など内容に合った簡潔な見出し。text はその具体的な内容を読んで分かるよう簡潔にまとめる。重要な情報が無ければ空配列。最大5件を厳守し、些末な事務的記述は省く。値が不明な項目は空文字または空配列。\n{HINT}スキーマ: {\"taikai_mei\":\"\",\"kaisai_dates\":[],\"kaijo\":\"\",\"kaijo_jusho\":\"\",\"kaikai_jikan\":\"\",\"shiai_keishiki\":\"\",\"shimekiri\":\"\",\"schedule\":[{\"date\":\"\",\"events\":\"\"}],\"sport\":\"\",\"format_label\":\"\",\"key_info\":[{\"label\":\"\",\"text\":\"\"}]}",
    "en": "You are an assistant that extracts information from event flyers and notices (concerts, recitals, exhibitions, lectures, seminars, festivals, community events, etc.). From the attached flyer, read the event date(s), event name, venue, address, start time, application/reservation deadline (if any), and the program for each day, and return JSON only (no preamble, explanation, or code fences). kaisai_dates is an array in YYYY-MM-DD. For an event held over a continuous period (such as an exhibition), put the first day and the last day in kaisai_dates. Do not include deadlines in kaisai_dates. schedule must have exactly one element per date in kaisai_dates; date must be the same YYYY-MM-DD format. events is a short description of the program or content for that day (e.g. performance title, session names, activities); empty string only if it truly cannot be determined, but never omit the element itself. kaikai_jikan is the start time as written, including doors-open / start distinctions if stated (e.g. \"Doors 17:30 / Start 18:00\"); empty string if unknown. shimekiri is the application or reservation deadline if any; empty string if none. sport must be an empty string. format_label is a natural short heading for the per-day content (e.g. Program); empty string if unsure.\nkey_info is an array of up to 5 items of the most important information a visitor or participant should know, in order of importance. Each element is {\"label\":\"short heading\",\"text\":\"content\"}. label examples: Admission, Tickets, Performers, Target audience, Capacity, How to apply, Parking, Rain policy. Empty array if none; strictly keep to a maximum of 5. Use an empty string or empty array for unknown values.\n{HINT}Schema: {\"taikai_mei\":\"\",\"kaisai_dates\":[],\"kaijo\":\"\",\"kaijo_jusho\":\"\",\"kaikai_jikan\":\"\",\"shiai_keishiki\":\"\",\"shimekiri\":\"\",\"schedule\":[{\"date\":\"\",\"events\":\"\"}],\"sport\":\"\",\"format_label\":\"\",\"key_info\":[{\"label\":\"\",\"text\":\"\"}]}"
  }
};

// イベントの種類ごとの一文（dropper-app の DROPPER_TYPES のキーと同じ。無い種類は一文なし）
export const HINTS = {
  "music": {
    "ja": "このチラシはコンサート・演奏会・発表会・舞台公演の告知です。kaikai_jikan には開場と開演の両方が書かれていれば「開場17:30 開演18:00」のように併記すること。schedule の events には、その日の演目・出演者・プログラム（例：ベートーヴェン交響曲第5番／第1部 合唱の部）を入れること。key_info には「出演」「指揮」「演目」「チケット料金（席種と価格）」「チケット発売日」「全席指定・自由席の別」「未就学児の入場可否」「主催・問合せ先」のうち、記載があり重要なものを優先して入れること。チケットの発売日は shimekiri（申込締切）ではない。発売日は key_info に入れ、shimekiri には予約や申込の締切がある場合だけ入れること。format_label は「演目」。\n",
    "en": "This flyer announces a concert, recital, or stage performance. If both doors-open and start times are given, put both in kaikai_jikan (e.g. \"Doors 17:30 / Start 18:00\"). In schedule events, put the programme or performers for that day. In key_info, prioritise: performers, conductor, programme, ticket prices by seat type, ticket on-sale date, reserved/unreserved seating, age restrictions, and the organiser or contact. A ticket on-sale date is NOT an application deadline: put it in key_info and leave shimekiri empty unless there is a real booking or application deadline. format_label should be \"Programme\".\n"
  },
  "exhibition": {
    "ja": "このチラシは展示会・個展・作品展の告知です。会期（例：10月1日〜10月12日）は初日と最終日の2つだけを kaisai_dates に入れ、その間の日は入れないこと。kaikai_jikan には開館時間（例「10:00〜17:00」）を入れること。schedule の events には、その日に行われる関連催し（オープニング、ギャラリートーク、講評会など）があれば入れること。key_info には「入場料」「休館日」「関連イベント」「最終日の閉館時刻」「出品・応募方法」「主催・問合せ先」のうち記載があり重要なものを優先して入れること。shimekiri は公募展などで出品・応募の締切がある場合だけ入れ、単なる会期の終わりは入れないこと。format_label は「展示内容」。\n",
    "en": "This flyer announces an exhibition, solo show, or art display. For a run of dates (e.g. 1–12 October), put only the first and last day in kaisai_dates, not the days in between. Put the opening hours in kaikai_jikan (e.g. \"10:00-17:00\"). In schedule events, note any related happenings that day (opening reception, gallery talk, critique). In key_info, prioritise: admission fee, closed days, related events, closing time on the final day, how to submit work, and the organiser or contact. Only set shimekiri when there is a real submission or entry deadline; the end of the run is not a deadline. format_label should be \"Exhibits\".\n"
  },
  "lecture": {
    "ja": "このチラシは講演会・セミナー・シンポジウム・講座・教室の告知です。kaikai_jikan には開始〜終了の時刻（例「13:30〜15:40」）を、記載があればそのまま入れること。schedule の events には、その日の演題と講師（例：講演①「◯◯」／山田太郎 氏）を入れること。key_info には「講師（所属・肩書）」「参加費」「定員」「対象」「申込方法」「会場参加とオンライン（Zoom等）の別」「主催・問合せ先」のうち、記載があり重要なものを優先して入れること。shimekiri には申込の締切日を入れること（「◯月◯日までに申し込み」も締切として扱う）。format_label は「演題」。\n",
    "en": "This flyer announces a lecture, seminar, symposium, course, or class. Put the start and end time in kaikai_jikan as written (e.g. \"13:30-15:40\"). In schedule events, put the talk title and speaker for that day. In key_info, prioritise: speaker with affiliation and title, fee, capacity, who it is for, how to apply, whether it is in person or online (Zoom etc.), and the organiser or contact. Put the application deadline in shimekiri (a phrase such as \"apply by 12 December\" counts as a deadline). format_label should be \"Topic\".\n"
  },
  "festival": {
    "ja": "このチラシは祭り・地域の催し・マルシェ・フリーマーケット・盆踊り・縁日などの告知です。kaikai_jikan には開催時間（例「10:00〜16:00」）を入れること。schedule の events には、その日の出し物・ステージ・体験コーナーなど催しの内容を入れること。key_info には「荒天・雨天時の扱い（中止／順延／小雨決行）」を最優先で入れ、続いて「入場料・参加費」「屋台・出店」「駐車場・交通アクセス」「交通規制」「対象」「主催・問合せ先」のうち記載があり重要なものを入れること。雨天時の記載は来場判断に直結するため、短くても必ず拾うこと。shimekiri は出店・参加の申込締切がある場合だけ入れること。format_label は「内容」。\n",
    "en": "This flyer announces a festival, community event, market, or similar local gathering. Put the opening times in kaikai_jikan (e.g. \"10:00-16:00\"). In schedule events, describe what happens that day (stage acts, stalls, hands-on corners). In key_info, put the bad-weather policy first (cancelled / postponed / goes ahead in light rain), then admission or fees, food stalls, parking and access, road closures, who it is for, and the organiser or contact. Always capture the wet-weather note even if it is brief, since it decides whether people turn up. Only set shimekiri when there is a deadline to apply or to book a stall. format_label should be \"Programme\".\n"
  }
};

export function eventPrompt(lang, type) {
  const L = lang === "ja" ? "ja" : "en";
  if (type === "sports") return EVENT.sports[L];
  return EVENT.general[L].replace("{HINT}", (HINTS[type] || {})[L] || "");
}

function promptJa(fy) {
  return '添付は予定表です（年間行事予定表・大会日程表・リーグ戦日程・月間カレンダーなど）。' +
    'この予定表に載っている予定を、ひとつ残らず読み取ってJSONだけで返してください（前置き・説明・コードフェンスは不要）。\n' +
    '■ 読み取り方\n' +
    '・カレンダーのマス目形式（日付のマスの中に行事名が書かれている形）の場合は、マスの位置をよく見て、日付と行事名を正しく対応付けること。\n' +
    '・1つのマスに複数の行事があれば、それぞれ別の要素にすること。\n' +
    '・表形式で1行に複数の予定が横に並ぶ場合も、それぞれ別の要素にすること。\n' +
    '■ 日付\n' +
    '・date は開始日、end は終了日（1日だけなら end は空文字）。どちらも YYYY-MM-DD。\n' +
    (fy ? ('・この予定表は ' + fy + '年度です。4月〜12月は ' + fy + '年、1月〜3月は ' + (fy + 1) + '年として西暦を補うこと。\n')
        : '・表に「令和◯年度」「◯◯年度」の記載があればそれに従い、4月〜12月は年度の年、1月〜3月は翌年として西暦を補うこと。年が全く分からない場合のみ date を空文字にすること。\n') +
    '■ 除外するもの\n' +
    '・祝日の名前（元日・成人の日・建国記念の日・春分の日・昭和の日・憲法記念日・みどりの日・こどもの日・海の日・山の日・敬老の日・秋分の日・スポーツの日・文化の日・勤労感謝の日・天皇誕生日・振替休日・国民の休日）は予定に含めないこと。\n' +
    '・「未定」「行事なし」など日付や内容が定まらないものは含めないこと。\n' +
    '・表の見出し行（「期日」「場所」「大会名」など）は含めないこと。\n' +
    '■ 各項目\n' +
    '・title は行事名。祝日名や日付・曜日は title に入れないこと。\n' +
    '・place は会場・場所（書かれていなければ空文字）。都道府県が会場と別の欄に分かれている場合は、' +
    '「静岡県 三島市民体育館」「徳島 松茂町総合体育館」のように、都道府県と会場をつなげて place に入れること' +
    '（同じ名前の体育館が各地にあるため、地図で場所を特定するのに要る）。\n' +
    '・time は開始時刻 HH:MM（書かれていなければ空文字）。\n' +
    '出力形式（この形のJSONだけを返す）:\n' +
    '{"items":[{"date":"YYYY-MM-DD","end":"","time":"","title":"","place":""}]}';
}
function promptEn(fy) {
  return 'The attachment is a schedule (annual event calendar, competition schedule, league fixture list, or monthly calendar grid). ' +
    'Read every scheduled item and return ONLY JSON (no preamble, explanation, or code fences).\n' +
    'How to read it:\n' +
    '- For a calendar grid (event names written inside date cells), look carefully at cell positions and pair each date with the right event name.\n' +
    '- If one cell holds several events, make each one a separate element. The same applies when one table row holds several entries side by side.\n' +
    'Dates:\n' +
    '- date is the start date and end is the end date (empty string for a single day). Both in YYYY-MM-DD.\n' +
    (fy ? ('- This schedule is for fiscal year ' + fy + '. Months April to December are ' + fy + ', January to March are ' + (fy + 1) + '.\n')
        : '- If the sheet states a fiscal year, follow it: April to December take that year, January to March the next. Only leave date empty if the year cannot be determined at all.\n') +
    'Exclude:\n' +
    '- Public holiday names, and rows marked as undecided or "no events".\n' +
    '- Table header rows such as "date", "venue", "event name".\n' +
    'Fields:\n' +
    '- title is the event name (no holiday names, dates or weekdays inside it).\n' +
    '- place is the venue (empty string if absent). If the prefecture or region sits in its own column, ' +
    'join it with the venue in place (e.g. "Tokushima Matsushige Gymnasium") -- venues in different ' +
    'places often share a name, so it is needed to pin the location on a map.\n' +
    '- time is the start time HH:MM (empty string if absent).\n' +
    'Output exactly this shape:\n' +
    '{"items":[{"date":"YYYY-MM-DD","end":"","time":"","title":"","place":""}]}';
}
export function schedulePrompt(lang, fy) {
  return lang === "ja" ? promptJa(fy) : promptEn(fy);
}
