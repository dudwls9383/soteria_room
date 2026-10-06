// Strict, whole-label patterns prevent translating imported titles accidentally.
export function translateCounts(text:string,language:"en"|"ja"):string {
  const ja=language==="ja";
  return text
    .replace(/^(.+) 재생목록 재생$/,ja?'$1のプレイリストを再生':'Play playlist $1')
    .replace(/^선택 범위에서 ([\d,]+)곡 정보 확인 · 조건에 맞는 ([\d,]+)곡$/,ja?'選択範囲の$1曲を確認済み・条件に合う$2曲':'$1 songs checked within scope · $2 matching songs')
    .replace(/^([\d,]+)곡$/,ja?'$1曲':'$1 songs')
    .replace(/^([\d,]+)개$/,ja?'$1件':'$1 items')
    .replace(/^([\d,]+)개 링크$/,ja?'$1件のリンク':'$1 links')
    .replace(/^([\d,]+)개 목록$/,ja?'$1件のプレイリスト':'$1 playlists')
    .replace(/^([\d,]+)강$/,ja?'$1曲':'$1 songs')
    .replace(/^(.+) · ([\d,]+)곡$/,ja?'$1 · $2曲':'$1 · $2 songs')
    .replace(/^([\d,]+)곡 정보 확인 · 조건에 맞는$/,ja?'$1曲を確認済み・条件に合う':'$1 songs checked · matching')
    .replace(/^재생목록에서 무작위로 (\d+)곡을 뽑아 대진을 만들어요\.$/,ja?'プレイリストから$1曲をランダムに選んで対戦を作ります。':'Choose $1 songs at random from the playlist to build the bracket.')
    .replace(/^번의 선택 · 단 하나의 우승곡$/,ja?'回の選択・優勝は一曲':'choices · one winner')
    .replace(/^동기화 로그 · ([12])차 · 최근 (\d+)개$/,ja?'同期記録・第$1段階・直近$2件':'Sync log · stage $1 · latest $2')
    .replace(/^([\d,]+)개 채널$/,ja?'$1チャンネル':'$1 channels')
    .replace(/^([\d,]+)회 조회$/,ja?'$1回再生':'$1 views')
    .replace(/^(\d{4})년$/,ja?'$1年':'$1')
    .replace(/^(\d{1,2})월$/,ja?'$1月':'Month $1')
    .replace(/^([1-4])분기$/,ja?'第$1四半期':'Q$1')
    .replace(/^목록 ([\d,]+)$/,ja?'リスト $1':'Queue $1')
    .replace(/^(.+) 곡 목록 보기$/,ja?'$1の曲を見る':'View songs in $1')
    .replace(/^(.+) 첫 곡 재생$/,ja?'$1の最初の曲を再生':'Play the first song in $1')
    .replace(/^(.+) 사이트에서 재생$/,ja?'$1をサイトで再生':'Play $1 here')
    .replace(/^(.+) 위로$/,ja?'$1を上へ':'Move $1 up')
    .replace(/^(.+) 아래로$/,ja?'$1を下へ':'Move $1 down')
    .replace(/^(.+) 목록에서 삭제$/,ja?'$1をリストから削除':'Remove $1 from queue')
    .replace(/^(자동|봄|여름|가을|겨울) 테마$/,(_,season)=>ja?({자동:'自動',봄:'春',여름:'夏',가을:'秋',겨울:'冬'} as Record<string,string>)[season]+'テーマ':({자동:'Auto',봄:'Spring',여름:'Summer',가을:'Autumn',겨울:'Winter'} as Record<string,string>)[season]+' theme')
    .replace(/^2개 목록을 처리했어요\. 남은 (\d+)개는 다음 실행에서 이어서 가져옵니다\.$/,ja?'2件を処理しました。残り$1件は次回再開します。':'Processed two playlists. The next run resumes the remaining $1.')
    .replace(/^([\d,]+)곡을 듣기 목록에 담았어요\.$/,ja?'$1曲をリストに追加しました。':'Added $1 songs to the queue.');
}
