import fetch from "node-fetch";

const TMDB_API_KEY = "29859fc7a310b3cba8d7e97bd8bbbdc9";
const SUPABASE_URL = "https://perkmsgjcqwrmlfefkfn.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlcmttc2dqY3F3cm1sZmVma2ZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU0OTI0NCwiZXhwIjoyMDgwMTI1MjQ0fQ.tBhE7rOMnWAypsP3zieSZGXprHtdSSxf_Rf5hYGUXCs";

const mustSeeTitles = [
  "The Wire",
  "The Sopranos",
  "Breaking Bad",
  "Mad Men",
  "Succession",
  "Better Call Saul",
  "Deadwood",
  "Boardwalk Empire",
  "Big Little Lies",
  "The Leftovers",
  "Six Feet Under",
  "The Americans",
  "Game of Thrones",
  "True Detective",
  "Chernobyl",
  "Friday Night Lights",
  "The Shield",
  "The Crown",
  "Fargo",
  "Peaky Blinders",
  "Narcos",
  "The Bear",
  "Severance",
  "The White Lotus",
  "Mindhunter",
  "Mr. Robot",
  "Justified",
  "Lost",
  "Rome",
  "The West Wing",
  "Orange Is the New Black",
  "The Handmaid's Tale",
  "Homeland",
  "Shōgun",
  "Happy Valley",
  "Luther",
  "Twin Peaks",
  "Rectify",
  "The Good Wife",
  "Line of Duty",
  "Ozark",
  "House of Cards",
  "The Night Of",
  "Bosch",
  "Sherlock",
  "Borgen",
  "The Bridge",
  "Broadchurch",
  "Station Eleven",
  "Atlanta",
  "Mare of Easttown",
  "Billions",
  "Industry",
  "Slow Horses",
  "Black Mirror",
  "The Affair",
  "The Last of Us",
  "Euphoria",
  "I May Destroy You",
  "Normal People",
  "Treme",
  "The Deuce",
  "Dexter",
  "Sons of Anarchy",
  "The Walking Dead",
  "Vikings",
  "Black Sails",
  "Damages",
  "The Newsroom",
  "House",
  "Grey's Anatomy",
  "Spartacus",
  "Top of the Lake",
  "For All Mankind",
  "Westworld",
  "Masters of Sex",
  "The Gilded Age",
  "Watchmen",
  "The Good Fight",
  "The Staircase",
  "Downton Abbey",
  "Outlander",
  "The Fall",
  "In Treatment",
  "Rescue Me",
  "Babylon Berlin",
  "The Morning Show",
  "The Diplomat",
  "1883",
  "1923",
  "Dopesick",
  "Godless",
  "Gomorrah",
  "The Bureau",
  "Counterpart",
  "Pachinko",
  "Shrinking",
  "Tokyo Vice",
  "Yellowstone",
  "Longmire",
  "The Borgias",
  "The Tudors",
  "Versailles",
  "Taboo",
  "Ripper Street",
  "The Alienist",
  "Warrior",
  "The Boys",
  "The Expanse",
  "Andor",
  "Foundation",
  "Dark",
  "Sense8",
  "The Man in the High Castle",
  "Killing Eve",
  "Bodyguard",
  "The Queen's Gambit",
  "The Night Manager",
  "Little Fires Everywhere",
  "Under the Banner of Heaven",
  "Better Things",
  "You",
  "Squid Game",
  "Midnight Sun",
  "The Killing",
  "Lupin",
  "Money Heist",
  "The Chestnut Man",
  "Trapped",
  "My Brilliant Friend",
  "Fauda",
  "Call My Agent!",
  "Snabba Cash",
  "Caliphate",
  "Occupied",
  "Suburra: Blood on Rome",
  "The Restaurant",
  "Undercurrent",
  "Deadwind",
  "Bordertown",
  "Quicksand",
  "The Woods",
  "Alice in Borderland",
  "The Glory",
  "Bad Sisters",
  "The Newsreader",
  "Mystery Road",
  "Big Love",
  "Carnivàle",
  "The Virtues",
  "This Is England '86",
  "This Is England '88",
  "This Is England '90",
  "Unforgotten",
  "Fleabag",
  "BoJack Horseman",
  "Parks and Recreation",
  "The Office",
  "Reservation Dogs",
  "Barry",
  "The Thick of It",
  "Utopia",
  "Detectorists",
];

const searchOverrides = {
  "Call My Agent!": ["Dix pour cent", "Call My Agent!"],
  "The Bridge": ["Bron/Broen", "The Bridge"],
  "Midnight Sun": ["Jour Polaire", "Midnight Sun"],
  "The Killing": ["Forbrydelsen", "The Killing"],
  "Money Heist": ["La Casa de Papel", "Money Heist"],
  "Deadwind": ["Karppi", "Deadwind"],
  "Bordertown": ["Sorjonen", "Bordertown"],
  "Quicksand": ["Störst av allt", "Quicksand"],
  "Caliphate": ["Kalifat", "Caliphate"],
  "Occupied": ["Okkupert", "Occupied"],
  "The Restaurant": ["Vår tid är nu", "The Restaurant"],
  "Undercurrent": ["L’Abîme", "Undercurrent"],
  "The Bureau": ["Le Bureau des Légendes", "The Bureau"],
  "Utopia": ["Utopia (UK)", "Utopia"],
  "Shōgun": ["Shogun", "Shōgun"],
  "Carnivàle": ["Carnivale", "Carnivàle"],
};

async function searchTMDBTV(query) {
  const url = `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  const json = await res.json();
  return json.results?.[0] || null;
}

async function upsertSeries(tv, requestedTitle) {
  const payload = {
    tmdb_id: `tv:${tv.id}`,
    name: tv.name,
    original_title: tv.original_name || requestedTitle,
    first_air_year: tv.first_air_date ? Number(tv.first_air_date.slice(0, 4)) : null,
    overview: tv.overview || null,
    poster_url: tv.poster_path
      ? `https://image.tmdb.org/t/p/w500${tv.poster_path}`
      : null,
    is_must_see: true,
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/series?on_conflict=tmdb_id`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates"
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase upsert failed: ${res.status} ${text}`);
  }
}

async function run() {
  let found = 0;
  let missed = 0;

  for (const title of mustSeeTitles) {
    const queries = searchOverrides[title] || [title];
    let tv = null;

    console.log(`Searching: ${title}`);

    for (const query of queries) {
      tv = await searchTMDBTV(query);
      if (tv) {
        console.log(`✅ Found: ${title} → ${tv.name}`);
        break;
      }
    }

    if (!tv) {
      console.log(`❌ Not found: ${title}`);
      missed++;
      continue;
    }

    await upsertSeries(tv, title);
    found++;
  }

  console.log(`Done. Found: ${found}. Missed: ${missed}.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});