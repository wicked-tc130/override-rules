const inArg = typeof $arguments !== 'undefined' ? $arguments : {};

const 
    // 启用负载均衡 (默认false)
    loadBalance = parseBool(inArg.loadbalance) || false,
    // 启用落地节点功能 (默认false)
    landing = parseBool(inArg.landing) || false,
    // 启用 IPv6 支持 (默认false)
    ipv6Enabled = parseBool(inArg.ipv6) || false,
    // 启用完整配置，用于纯内核启动 (默认false)
    fullConfig = parseBool(inArg.full) || false,
    // 启用 tcp-keep-alive (默认false)
    keepAliveEnabled = parseBool(inArg.keepalive) || false,
    // DNS 使用 FakeIP 而不是 RedirHost (默认false)
    fakeIPEnabled = parseBool(inArg.fakeip) || false;

function buildBaseLists({ landing, lowCost, countryInfo }) {
    // 筛选节点数量大于0的地区，并生成对应的组名
    const countryGroupNames = countryInfo
        .filter(item => item.count > 0)
        .map(item => item.country + "节点");

    // selector: 选择节点组的候选列表
    const selector = ["故障转移"];
    if (landing) selector.push("落地节点");
    selector.push(...countryGroupNames);
    selector.push("DIRECT");

    // defaultProxies: 默认策略组（如 YouTube, AI）引用的候选列表
    const defaultProxies = ["选择节点", ...countryGroupNames];
    defaultProxies.push("直连");

    // defaultProxiesDirect: 直连优先的策略组引用的候选列表
    const defaultProxiesDirect = ["直连", ...countryGroupNames, "选择节点"];

    // defaultFallback: 故障转移组的候选列表
    const defaultFallback = [];
    if (landing) defaultFallback.push("落地节点");
    defaultFallback.push(...countryGroupNames);
    defaultFallback.push("DIRECT");

    return { defaultProxies, defaultProxiesDirect, defaultSelector: selector, defaultFallback, countryGroupNames };
}

// 外部规则集定义
const ruleProviders = {};

// 路由规则列表
const rules = [
    "GEOSITE,CATEGORY-AI-!CN,AI",
    "GEOSITE,YOUTUBE,YouTube",
    "GEOSITE,SPOTIFY,Spotify",
    "GEOSITE,MICROSOFT@CN,直连",
    "GEOSITE,GFW,选择节点",
    "GEOSITE,CN,直连",
    "GEOSITE,PRIVATE,直连",
    "GEOIP,CN,直连",
    "GEOIP,PRIVATE,直连",
    "DOMAIN-SUFFIX,jpushoa.com,直连",
    "GEOSITE,GITHUB,GitHub",
    "MATCH,选择节点"
];

// 流量嗅探配置
const snifferConfig = {
    "sniff": {
        "TLS": {
            "ports": [443, 8443],
        },
        "HTTP": {
            "ports": [80, 8080, 8880],
        },
        "QUIC": {
            "ports": [443, 8443],
        }
    },
    "override-destination": false,
    "enable": true,
    "force-dns-mapping": true,
    "skip-domain": [
        "Mijia Cloud",
        "dlg.io.mi.com",
        "+.push.apple.com"
    ]
};

// DNS 配置 (RedirHost 模式)
const dnsConfig = {
    "enable": true,
    "ipv6": ipv6Enabled,
    "prefer-h3": true,
    "enhanced-mode": "redir-host",
    "default-nameserver": [
        "119.29.29.29",
        "223.5.5.5",
    ],
    "nameserver": [
        "system",
        "223.5.5.5",
        "119.29.29.29",
        "180.184.1.1",
    ],
    "fallback": [
        "quic://dns0.eu",
        "https://dns.cloudflare.com/dns-query",
        "https://dns.sb/dns-query",
        "tcp://208.67.222.222",
        "tcp://8.26.56.2"
    ],
    "proxy-server-nameserver": [
        "quic://223.5.5.5",
        "tls://dot.pub",
    ]
};

// DNS 配置 (FakeIP 模式)
const dnsConfig2 = {
    "enable": true,
    "ipv6": ipv6Enabled,
    "prefer-h3": true,
    "enhanced-mode": "fake-ip",
    "fake-ip-filter": [
        "geosite:private",
        "geosite:connectivity-check",
        "geosite:cn",
        "Mijia Cloud",
        "dig.io.mi.com",
        "localhost.ptlogin2.qq.com",
        "*.icloud.com",
        "*.stun.*.*",
        "*.stun.*.*.*"
    ],
    "default-nameserver": [
        "119.29.29.29",
        "223.5.5.5",
    ],
    "nameserver": [
        "system",
        "223.5.5.5",
        "119.29.29.29",
        "180.184.1.1",
    ],
    "fallback": [
        "quic://dns0.eu",
        "https://dns.cloudflare.com/dns-query",
        "https://dns.sb/dns-query",
        "tcp://208.67.222.222",
        "tcp://8.26.56.2"
    ],
    "proxy-server-nameserver": [
        "quic://223.5.5.5",
        "tls://dot.pub",
    ]
};

// 地理数据文件URL
const geoxURL = {
    "geoip": "https://cdn.jsdelivr.net/gh/Loyalsoldier/v2ray-rules-dat@release/geoip.dat",
    "geosite": "https://cdn.jsdelivr.net/gh/Loyalsoldier/v2ray-rules-dat@release/geosite.dat",
    "mmdb": "https://cdn.jsdelivr.net/gh/Loyalsoldier/geoip@release/Country.mmdb",
    "asn": "https://cdn.jsdelivr.net/gh/Loyalsoldier/geoip@release/GeoLite2-ASN.mmdb"
};

// 地区元数据及匹配规则
const countriesMeta = {
    "香港": {
        pattern: "(?i)香港|港|HK|hk|Hong Kong|HongKong|hongkong|🇭🇰",
        icon: "https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Hong_Kong.png"
    },
    "澳门": {
        pattern: "(?i)澳门|MO|Macau|🇲🇴",
        icon: "https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Macao.png"
    },
    "台湾": {
        pattern: "(?i)台|新北|彰化|TW|Taiwan|🇹🇼",
        icon: "https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Taiwan.png"
    },
    "狮城": {
        pattern: "(?i)新加坡|坡|狮城|SG|Singapore|🇸🇬",
        icon: "https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Singapore.png"
    },
    "日本": {
        pattern: "(?i)日本|川日|东京|大阪|泉日|埼玉|沪日|深日|JP|Japan|🇯🇵",
        icon: "https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Japan.png"
    },
    "韩国": {
        pattern: "(?i)KR|Korea|KOR|首尔|韩|韓|🇰🇷",
        icon: "https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Korea.png"
    },
    "美国": {
        pattern: "(?i)美国|美|US|United States|🇺🇸",
        icon: "https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/United_States.png"
    },
    "英国": {
        pattern: "(?i)英国|United Kingdom|UK|伦敦|London|🇬🇧",
        icon: "https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/United_Kingdom.png"
    },
    "澳洲": {
        pattern: "(?i)澳洲|澳大利亚|AU|Australia|🇦🇺",
        icon: "https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Australia.png"
    },
    "德国": {
        pattern: "(?i)德国|德|DE|Germany|🇩🇪",
        icon: "https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Germany.png"
    },
};

function parseBool(value) {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
        return value.toLowerCase() === "true" || value === "1";
    }
    return false;
}

function hasLowCost(config) {
    const proxies = config["proxies"];
    const lowCostRegex = new RegExp(/0\.[0-5]|低倍率|省流|大流量|实验性/, 'i');
    for (const proxy of proxies) {
        if (lowCostRegex.test(proxy.name)) {
            return true;
        }
    }
    return false;
}

// 解析节点并统计各地区数量
function parseCountries(config) {
    const proxies = config.proxies || [];
    const ispRegex = /家宽|家庭|家庭宽带|商宽|商业宽带|星链|Starlink|落地/i;

    const countryCounts = Object.create(null);

    const compiledRegex = {};
    for (const [country, meta] of Object.entries(countriesMeta)) {
        compiledRegex[country] = new RegExp(
            meta.pattern.replace(/^\(\?i\)/, ''),
            'i'
        );
    }

    for (const proxy of proxies) {
        const name = proxy.name || '';

        if (ispRegex.test(name)) continue;

        for (const [country, regex] of Object.entries(compiledRegex)) {
            if (regex.test(name)) {
                countryCounts[country] = (countryCounts[country] || 0) + 1;
                break;
            }
        }
    }

    const result = [];
    for (const [country, count] of Object.entries(countryCounts)) {
        result.push({ country, count });
    }

    return result;
}

// 构建地区专有代理组 (Url-Test 或 Load-Balance)
function buildCountryProxyGroups(countryList) {
    const countryProxyGroups = [];

    for (const country of countryList) {
        if (countriesMeta[country]) {
            const groupName = `${country}节点`;
            const pattern = countriesMeta[country].pattern;

            const groupConfig = {
                "name": groupName,
                "icon": countriesMeta[country].icon,
                "include-all": true,
                "filter": pattern,
                // 排除低倍率和落地节点
                "exclude-filter": landing ? "(?i)家宽|家庭|家庭宽带|商宽|商业宽带|星链|Starlink|落地|0\.[0-5]|低倍率|省流|大流量|实验性" : "0\.[0-5]|低倍率|省流|大流量|实验性",
                "type": (loadBalance) ? "load-balance" : "url-test",
            };

            if (!loadBalance) {
                Object.assign(groupConfig, {
                    "url": "https://cp.cloudflare.com/generate_204",
                    "interval": 60,
                    "tolerance": 20,
                    "lazy": false
                });
            }

            countryProxyGroups.push(groupConfig);
        }
    }

    return countryProxyGroups;
}

// 构建所有策略组
function buildProxyGroups({
    countryList,
    countryProxyGroups,
    lowCost,
    defaultProxies,
    defaultProxiesDirect,
    defaultSelector,
    defaultFallback
}) {
    // 排除落地节点和故障转移，用于前置代理组
    const frontProxySelector = [
        ...defaultSelector.filter(name => name !== "落地节点" && name !== "故障转移")
    ];

    return [
        {
            "name": "选择节点", // 主策略组
            "icon": "https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Proxy.png",
            "type": "select",
            "proxies": defaultSelector
        },
        // 移除 手动选择 组
        (landing) ? {
            "name": "前置代理", // 用于规则集中的代理，排除落地
            "icon": "https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Area.png",
            "type": "select",
            "include-all": true,
            "exclude-filter": "(?i)家宽|家庭|家庭宽带|商宽|商业宽带|星链|Starlink|落地",
            "proxies": frontProxySelector
        } : null,
        (landing) ? {
            "name": "落地节点", // 仅包含落地节点
            "icon": "https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Airport.png",
            "type": "select",
            "include-all": true,
            "filter": "(?i)家宽|家庭|家庭宽带|商宽|商业宽带|星链|Starlink|落地",
        } : null,
        {
            "name": "故障转移", // 节点容灾，自动切换
            "icon": "https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Bypass.png",
            "type": "fallback",
            "url": "https://cp.cloudflare.com/generate_204",
            "proxies": defaultFallback,
            "interval": 180,
            "tolerance": 20,
            "lazy": false
        },
        // 应用策略组
        {
            "name": "AI",
            "icon": "https://cdn.jsdelivr.net/gh/powerfullz/override-rules@master/icons/chatgpt.png",
            "type": "select",
            "proxies": defaultProxies
        },
        {
            "name": "GitHub",
            "icon": "https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/GitHub.png",
            "type": "select",
            "proxies": defaultProxies
        },        
        {
            "name": "Spotify",
            "icon": "https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Spotify.png",
            "type": "select",
            "proxies": defaultProxies
        },
        {
            "name": "YouTube",
            "icon": "https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/YouTube.png",
            "type": "select",
            "proxies": defaultProxies
        },        
        {
            "name": "直连",
            "icon": "https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Direct.png",
            "type": "select",
            "proxies": [
                "DIRECT", "选择节点"
            ]
        },
        // 地区节点组
        ...countryProxyGroups
    ].filter(Boolean);
}

function main(config) {
    config = { proxies: config.proxies };
    // 解析地区信息
    const countryInfo = parseCountries(config);
    // 低倍率节点检查结果
    const lowCost = hasLowCost(config);

    // 构建基础策略列表
    const {
        defaultProxies,
        defaultProxiesDirect,
        defaultSelector,
        defaultFallback,
        countryGroupNames: targetCountryList
    } = buildBaseLists({ landing, lowCost: false, countryInfo });

    // 为地区构建对应的 url-test / load-balance 组
    const countryProxyGroups = buildCountryProxyGroups(targetCountryList.map(n => n.replace(/节点$/, '')));

    // 生成代理组
    const proxyGroups = buildProxyGroups({
        countryList: targetCountryList.map(n => n.replace(/节点$/, '')),
        countryProxyGroups,
        lowCost: false,
        defaultProxies,
        defaultProxiesDirect,
        defaultSelector,
        defaultFallback
    });
    
    // 生成 GLOBAL 组
    const globalProxies = proxyGroups.map(item => item.name);
    proxyGroups.push(
        {
            "name": "GLOBAL",
            "icon": "https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Global.png",
            "include-all": true,
            "type": "select",
            "proxies": globalProxies
        }
    );

    // 完整配置模式下的设置
    if (fullConfig) Object.assign(config, {
        "mixed-port": 7890,
        "redir-port": 7892,
        "tproxy-port": 7893,
        "routing-mark": 7894,
        "allow-lan": true,
        "ipv6": ipv6Enabled,
        "mode": "rule",
        "unified-delay": true,
        "tcp-concurrent": true,
        "find-process-mode": "off",
        "log-level": "info",
        "geodata-loader": "standard",
        "external-controller": ":9999",
        "disable-keep-alive": !keepAliveEnabled,
        "profile": {
            "store-selected": true,
        }
    });

    // 合并最终配置
    Object.assign(config, {
        "proxy-groups": proxyGroups,
        "rule-providers": ruleProviders,
        "rules": rules,
        "sniffer": snifferConfig,
        "dns": fakeIPEnabled ? dnsConfig2 : dnsConfig,
        "geodata-mode": true,
        "geox-url": geoxURL,
    });

    return config;
}
