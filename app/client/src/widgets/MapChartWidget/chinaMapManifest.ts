export interface ChinaMapResource {
  mapId: string;
  file: string;
  adcode: string;
  name: string;
  level: "nationwide" | "province";
  childAvailable: boolean;
}

export const CHINA_NATIONWIDE_MAP_ID = "CHINA_PROVINCES";

const provinceDefinitions = [
  ["110000", "北京市"],
  ["120000", "天津市"],
  ["130000", "河北省"],
  ["140000", "山西省"],
  ["150000", "内蒙古自治区"],
  ["210000", "辽宁省"],
  ["220000", "吉林省"],
  ["230000", "黑龙江省"],
  ["310000", "上海市"],
  ["320000", "江苏省"],
  ["330000", "浙江省"],
  ["340000", "安徽省"],
  ["350000", "福建省"],
  ["360000", "江西省"],
  ["370000", "山东省"],
  ["410000", "河南省"],
  ["420000", "湖北省"],
  ["430000", "湖南省"],
  ["440000", "广东省"],
  ["450000", "广西壮族自治区"],
  ["460000", "海南省"],
  ["500000", "重庆市"],
  ["510000", "四川省"],
  ["520000", "贵州省"],
  ["530000", "云南省"],
  ["540000", "西藏自治区"],
  ["610000", "陕西省"],
  ["620000", "甘肃省"],
  ["630000", "青海省"],
  ["640000", "宁夏回族自治区"],
  ["650000", "新疆维吾尔自治区"],
  ["810000", "香港特别行政区"],
  ["820000", "澳门特别行政区"],
] as const;

export const CHINA_PROVINCE_MAPS: readonly ChinaMapResource[] =
  provinceDefinitions.map(([adcode, name]) => ({
    mapId: `CHINA_${adcode}`,
    file: `/static/maps/china-provinces/${adcode}_full.json`,
    adcode,
    name,
    level: "province",
    childAvailable: true,
  }));

const nationwideResource: ChinaMapResource = {
  mapId: CHINA_NATIONWIDE_MAP_ID,
  file: "/static/maps/CHINA_PROVINCES.json",
  adcode: "100000",
  name: "中国",
  level: "nationwide",
  childAvailable: false,
};

const resources = [nationwideResource, ...CHINA_PROVINCE_MAPS];
const resourceByMapId = new Map(
  resources.map((resource) => [resource.mapId, resource]),
);

export function getChinaMapResource(
  mapId: string,
): ChinaMapResource | undefined {
  return resourceByMapId.get(mapId);
}

export function isChinaMapId(mapId: string): boolean {
  return resourceByMapId.has(mapId);
}
