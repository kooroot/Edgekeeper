const ENGLAND_FLAG = "\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}";
const SCOTLAND_FLAG = "\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}";

const COUNTRY_FLAGS: Record<string, string> = {
  Algeria: "🇩🇿",
  Argentina: "🇦🇷",
  Australia: "🇦🇺",
  Austria: "🇦🇹",
  Belgium: "🇧🇪",
  "Bosnia & Herzegovina": "🇧🇦",
  Brazil: "🇧🇷",
  Canada: "🇨🇦",
  "Cape Verde": "🇨🇻",
  Colombia: "🇨🇴",
  "Congo DR": "🇨🇩",
  Croatia: "🇭🇷",
  Curacao: "🇨🇼",
  "Czech Republic": "🇨🇿",
  Ecuador: "🇪🇨",
  Egypt: "🇪🇬",
  England: ENGLAND_FLAG,
  France: "🇫🇷",
  Germany: "🇩🇪",
  Ghana: "🇬🇭",
  Haiti: "🇭🇹",
  Iran: "🇮🇷",
  Iraq: "🇮🇶",
  "Ivory Coast": "🇨🇮",
  Japan: "🇯🇵",
  Jordan: "🇯🇴",
  Mexico: "🇲🇽",
  Morocco: "🇲🇦",
  Netherlands: "🇳🇱",
  "New Zealand": "🇳🇿",
  Norway: "🇳🇴",
  Panama: "🇵🇦",
  Paraguay: "🇵🇾",
  Portugal: "🇵🇹",
  Qatar: "🇶🇦",
  "Saudi Arabia": "🇸🇦",
  Scotland: SCOTLAND_FLAG,
  Senegal: "🇸🇳",
  "South Africa": "🇿🇦",
  "South Korea": "🇰🇷",
  Spain: "🇪🇸",
  Sweden: "🇸🇪",
  Switzerland: "🇨🇭",
  Tunisia: "🇹🇳",
  Turkey: "🇹🇷",
  USA: "🇺🇸",
  Uruguay: "🇺🇾",
  Uzbekistan: "🇺🇿",
};

export function flagForCountry(name: string) {
  return COUNTRY_FLAGS[name.trim()];
}

export function countryWithFlag(name: string) {
  const flag = flagForCountry(name);
  return flag ? `${flag} ${name}` : name;
}
