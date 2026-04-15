const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const DATA_PATH = path.join(__dirname, "../app/data/afl_players26.json");

const SOURCES = {
  disposals: {
    type: "footywire_average",
    url: "https://www.footywire.com/afl/footy/ft_player_rankings?year=2026&rt=LA&pt=&st=DI&mg=1",
    field: "disposals",
  },
  goals: {
    type: "footywire_total",
    url: "https://www.footywire.com/afl/footy/ft_player_rankings?year=2026&rt=LT&pt=&st=GO&mg=1",
    field: "goals",
  },
  kicks: {
    type: "footywire_average",
    url: "https://www.footywire.com/afl/footy/ft_player_rankings?year=2026&rt=LA&pt=&st=KI&mg=1",
    field: "kicks",
  },
  handballs: {
    type: "footywire_average",
    url: "https://www.footywire.com/afl/footy/ft_player_rankings?year=2026&rt=LA&pt=&st=HB&mg=1",
    field: "handballs",
  },
  marks: {
    type: "footywire_average",
    url: "https://www.footywire.com/afl/footy/ft_player_rankings?year=2026&rt=LA&pt=&st=MA&mg=1",
    field: "marks",
  },
  tackles: {
    type: "footywire_average",
    url: "https://www.footywire.com/afl/footy/ft_player_rankings?year=2026&rt=LA&pt=&st=TA&mg=1",
    field: "tackles",
  },
  hitouts: {
    type: "footywire_average",
    url: "https://www.footywire.com/afl/footy/ft_player_rankings?year=2026&rt=LA&pt=&st=HO&mg=1",
    field: "hitouts",
  },
  sc_points: {
    type: "footywire_average",
    url: "https://www.footywire.com/afl/footy/ft_player_rankings?year=2026&rt=LA&pt=&st=SU&mg=1",
    field: "sc_points",
  },
  bounces: {
    type: "footywire_total",
    url: "https://www.footywire.com/afl/footy/ft_player_rankings?year=2026&rt=LT&pt=&st=BO&mg=1",
    field: "bounces",
  },
  metres_gained: {
    type: "footywire_total",
    url: "https://www.footywire.com/afl/footy/ft_player_rankings?year=2026&rt=LT&pt=&st=MG&mg=1",
    field: "metres_gained",
  },
};

const TEAM_PATTERN =
  "(Crows|Lions|Blues|Magpies|Bombers|Dockers|Cats|Suns|Giants|Hawks|Demons|Kangaroos|Power|Tigers|Saints|Swans|Eagles|Bulldogs)";

const CLUB_ALIASES = {
  crows: "Adelaide",
  lions: "Brisbane",
  blues: "Carlton",
  magpies: "Collingwood",
  bombers: "Essendon",
  dockers: "Fremantle",
  cats: "Geelong",
  suns: "Gold Coast",
  giants: "GWS",
  hawks: "Hawthorn",
  demons: "Melbourne",
  kangaroos: "North Melbourne",
  power: "Port Adelaide",
  tigers: "Richmond",
  saints: "St Kilda",
  swans: "Sydney",
  eagles: "West Coast",
  bulldogs: "Western Bulldogs",

  "brisbane lions": "Brisbane",
  "gold coast suns": "Gold Coast",
  "greater western sydney": "GWS",
  "greater western sydney giants": "GWS",
  "gws giants": "GWS",
  "western bulldogs": "Western Bulldogs",
  "north melbourne": "North Melbourne",
  "port adelaide": "Port Adelaide",
  "west coast": "West Coast",
  "west coast eagles": "West Coast",
};

const NAME_ALIASES = {
  "thomas liberatore": "tom liberatore",
  "matthew crouch": "matt crouch",
  "zach bailey": "zac bailey",
  "alexander neal bullen": "alex neal bullen",
  "samuel powell pepper": "sam powell pepper",
  "edward richards": "ed richards",
  "cameron rayner": "cam rayner",
  "cameron zurhaar": "cam zurhaar",
  "benjamin king": "ben king",
  "maxwell king": "max king",
  "matt johnson": "matthew johnson",
  "matt carroll": "matthew carroll",
  "lachlan schultz": "lachie schultz",
  "timothy english": "tim english",
  "nick murray": "nicholas murray",
  "maurice rioli": "maurice rioli jr",
  "oliver wines": "ollie wines",

  // Extra safety aliases
  "bailey macdonald": "bailey macdonald",
  "connor macdonald": "connor macdonald",
  "cameron mackenzie": "cam mackenzie",
  "bradley close": "brad close",
  "bailey j williams": "bailey williams",
"lachlan fogarty": "lachie fogarty",
"angus anderson": "angus anderson",
"nick madden": "nicholas madden",
"louis emmett": "louis emmett",
};

function cleanText(str) {
  return String(str || "")
    .replace(/\u00a0/g, " ")
    .replace(/[’']/g, "")
    .replace(/\./g, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function titleCase(str) {
  return String(str || "")
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeClub(club) {
  const cleaned = cleanText(club);
  return CLUB_ALIASES[cleaned] || String(club || "").trim();
}

function normalizeName(name) {
  const cleaned = cleanText(name);
  return NAME_ALIASES[cleaned] || cleaned;
}

function makeKey(name, club) {
  return `${normalizeName(name)}|${cleanText(normalizeClub(club))}`;
}

function parseNumber(value) {
  const cleaned = String(value ?? "").replace(/[^\d.-]/g, "");
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch ${url} (${res.status})`);
  }

  return await res.text();
}

function getRowTexts(html) {
  const $ = cheerio.load(html);
  const rows = [];

  $("tr").each((_, tr) => {
    const text = $(tr).text().replace(/\s+/g, " ").trim();
    if (text) rows.push(text);
  });

  return rows;
}

function extractFootywireAverage(html) {
  const rows = getRowTexts(html);

  const rowRegex = new RegExp(
    `^\\d+\\s+(.+?)\\s+${TEAM_PATTERN}\\s+(\\d+)\\s+(-?\\d+(?:\\.\\d+)?)\\s+v\\s+.+?,\\s+Round\\s+\\d+\\s+(-?\\d+(?:\\.\\d+)?)$`
  );

  const results = new Map();

  for (const row of rows) {
    const match = row.match(rowRegex);
    if (!match) continue;

    const [, player, club, games, lastGameValue, average] = match;

    results.set(makeKey(player, club), {
      player: player.trim(),
      club: normalizeClub(club),
      games: parseNumber(games),
      lastGameValue: parseNumber(lastGameValue),
      value: parseNumber(average),
    });
  }

  if (!results.size) {
    throw new Error("Could not parse any FootyWire average rows.");
  }

  return results;
}

function extractFootywireTotal(html) {
  const rows = getRowTexts(html);

  const rowRegex = new RegExp(
    `^\\d+\\s+(.+?)\\s+${TEAM_PATTERN}\\s+(\\d+)\\s+(-?\\d+(?:\\.\\d+)?)\\s+v\\s+.+?,\\s+Round\\s+\\d+\\s+(-?\\d+(?:\\.\\d+)?)$`
  );

  const results = new Map();

  for (const row of rows) {
    const match = row.match(rowRegex);
    if (!match) continue;

    const [, player, club, games, lastGameValue, total] = match;

    results.set(makeKey(player, club), {
      player: player.trim(),
      club: normalizeClub(club),
      games: parseNumber(games),
      lastGameValue: parseNumber(lastGameValue),
      value: parseNumber(total),
    });
  }

  if (!results.size) {
    throw new Error("Could not parse any FootyWire total rows.");
  }

  return results;
}

function extractZeroHangerHeights(html) {
  const $ = cheerio.load(html);
  const textLines = $.text().split("\n").map((x) => x.trim()).filter(Boolean);

  const results = new Map();

  let pendingNames = [];

  for (const line of textLines) {
    const heightMatch = line.match(/^(\d{3})cm\b/);

    if (heightMatch) {
      const height = parseNumber(heightMatch[1]);

      for (const rawName of pendingNames) {
        const cleanNameValue = normalizeName(rawName);
        if (!cleanNameValue) continue;

        results.set(cleanNameValue, {
          player: titleCase(rawName),
          value: height,
        });
      }

      pendingNames = [];
      continue;
    }

    if (line.includes(",") && !line.includes("http") && !line.includes("2026")) {
      const names = line
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
        .filter((x) => /^[A-Za-z' -]+$/.test(x));

      if (names.length >= 2) {
        pendingNames = names;
      }
    }
  }

  if (!results.size) {
    throw new Error("Could not parse any Zero Hanger height rows.");
  }

  return results;
}

function loadPlayers() {
  return JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
}

function savePlayers(players) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(players, null, 2) + "\n", "utf8");
}

function ensureField(player, field) {
  if (!(field in player)) {
    player[field] = 0;
  }
}

async function fetchAndParseSource(sourceKey, config) {
  console.log(`Fetching ${sourceKey}...`);
  const html = await fetchHtml(config.url);

  console.log(`Parsing ${sourceKey}...`);
  if (config.type === "footywire_average") {
    return extractFootywireAverage(html);
  }
  if (config.type === "footywire_total") {
    return extractFootywireTotal(html);
  }
  if (config.type === "zerohanger_height") {
    return extractZeroHangerHeights(html);
  }

  throw new Error(`Unknown source type: ${config.type}`);
}

async function main() {
  console.log("Loading player file...");
  const players = loadPlayers();

  const parsedSources = {};
  for (const [sourceKey, config] of Object.entries(SOURCES)) {
    try {
      parsedSources[sourceKey] = await fetchAndParseSource(sourceKey, config);
    } catch (err) {
      console.log(`Skipping ${sourceKey}: ${err.message}`);
      parsedSources[sourceKey] = new Map();
    }
  }

  const updateCounts = {};
  const unmatched = {};

  for (const key of Object.keys(SOURCES)) {
    updateCounts[key] = 0;
    unmatched[key] = [];
  }

  for (const player of players) {
    const clubKey = makeKey(player.name, player.club);
    const nameOnlyKey = normalizeName(player.name);

    for (const [sourceKey, config] of Object.entries(SOURCES)) {
      ensureField(player, config.field);

      const sourceMap = parsedSources[sourceKey];
      let entry = null;

      if (config.type === "zerohanger_height") {
        entry = sourceMap.get(nameOnlyKey) || null;
      } else {
        entry = sourceMap.get(clubKey) || null;
      }

      if (!entry) continue;

      const oldValue = Number(player[config.field] || 0);
      const newValue = entry.value;

      if (oldValue !== newValue) {
        player[config.field] = newValue;
        updateCounts[sourceKey] += 1;
      }

      sourceMap.delete(config.type === "zerohanger_height" ? nameOnlyKey : clubKey);
    }
  }

  for (const [sourceKey, config] of Object.entries(SOURCES)) {
    const sourceMap = parsedSources[sourceKey];

    for (const [, item] of sourceMap) {
      if (config.type === "zerohanger_height") {
        unmatched[sourceKey].push(item.player);
      } else {
        unmatched[sourceKey].push(`${item.player} (${item.club})`);
      }
    }
  }

  savePlayers(players);

  console.log("");
  console.log("Done.");
  console.log("");

  for (const [sourceKey, config] of Object.entries(SOURCES)) {
    console.log(`${config.field} updated: ${updateCounts[sourceKey]}`);
    console.log(`Unmatched ${config.field}: ${unmatched[sourceKey].length}`);

    if (unmatched[sourceKey].length) {
      unmatched[sourceKey]
        .slice(0, 15)
        .forEach((x) => console.log(`- ${x}`));
      console.log("");
    }
  }
}

main().catch((err) => {
  console.error("");
  console.error("Update failed:");
  console.error(err);
  process.exit(1);
});