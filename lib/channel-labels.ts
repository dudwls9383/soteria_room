// Stored extension tag IDs stay unchanged; these are presentation labels only.
export const channelTagOrder = [
  "VocalMale",
  "ShotaVo",
  "VocalFemale",
  "KawaVo",
  "Composer",
  "Topic",
  "Playlist",
  "ASMR",
  "Japan",
  "Korea",
];
export const channelTagLabels: Record<string, string> = {
  VocalMale: "메이저 남",
  ShotaVo: "우타이테 남",
  VocalFemale: "메이저 여",
  KawaVo: "우타이테 여",
  Topic: "토픽",
  Playlist: "플레이리스트",
  ASMR: "ASMR",
  Japan: "일본",
  Korea: "한국",
  Composer: "작곡가",
};
export function localizedChannelTags(language: "ko" | "ja" | "en") {
  if (language === "ko") return channelTagLabels;
  return language === "ja"
    ? {
        VocalMale: "メジャー・男性",
        ShotaVo: "歌い手・男性",
        VocalFemale: "メジャー・女性",
        KawaVo: "歌い手・女性",
        Topic: "トピック",
        Playlist: "プレイリスト",
        ASMR: "ASMR",
        Japan: "日本",
        Korea: "韓国",
        Composer: "作曲家",
      }
    : {
        VocalMale: "Mainstream men",
        ShotaVo: "Male utaite",
        VocalFemale: "Mainstream women",
        KawaVo: "Female utaite",
        Topic: "Topic",
        Playlist: "Playlist",
        ASMR: "ASMR",
        Japan: "Japan",
        Korea: "Korea",
        Composer: "Composer",
      };
}
export function compareChannelTags(a: string, b: string) {
  const index = (id: string) => {
    const n = channelTagOrder.indexOf(id);
    return n < 0 ? channelTagOrder.length : n;
  };
  return index(a) - index(b) || a.localeCompare(b);
}
export function displayChannelTags(tags: string[]) {
  const aliases: Record<string,string> = {"vocal(M)":"VocalMale", "vocal(f)":"VocalFemale", KawaVo2:"KawaVo", composer:"Composer"};
  const ids = tags.map(tag => tag.replace(/_ysm_\d+$/, "")).map(tag => aliases[tag] || tag);
  return [...new Set(ids)].sort(compareChannelTags).map(tag => channelTagLabels[tag] || tag);
}
