/**
 * Campus Buildings and Powerups Configuration
 * This list is populated from the Carleton campus building CSV data.
 * Customize the coordinates (lat, lng) to match your own university campus.
 */
const BUILDINGS = [
  {
    "id": "IH",
    "name": "Advanced Capital Ice House",
    "lat": 45.38536821733845,
    "lng": -75.69285574,
    "powerup": {
      "type": "points",
      "value": 100,
      "description": "Gives +100 Points"
    },
    "description": "Also known as the Carleton Ice House on official campus maps — doubles as a library storage facility, not just an ice rink."
  },
  {
    "id": "AH",
    "name": "Alumni Hall",
    "lat": 45.386487340048504,
    "lng": -75.69329078,
    "powerup": {
      "type": "points",
      "value": 100,
      "description": "Gives +100 Points"
    },
    "description": "Sits near Southam Hall in the historic quad area of campus."
  },
  {
    "id": "AF",
    "name": "Andrew Fleck Childcare Centre",
    "lat": 45.385539643684496,
    "lng": -75.69412174,
    "powerup": {
      "type": "points",
      "value": 100,
      "description": "Gives +100 Points"
    },
    "description": "On-campus childcare facility serving Carleton students, staff, and faculty with children."
  },
  {
    "id": "AA",
    "name": "Architecture Building",
    "lat": 45.38415487921713,
    "lng": -75.6974504,
    "powerup": {
      "type": "points",
      "value": 100,
      "description": "Gives +100 Points"
    },
    "description": "Home of the Azrieli School of Architecture and Urbanism. Alum Paul Denham Austerberry (BArch '89) won an Academy Award for production design on Guillermo del Toro's The Shape of Water."
  },
  {
    "id": "AR",
    "name": "ARISE Building",
    "lat": 45.381286794143485,
    "lng": -75.6980899,
    "powerup": {
      "type": "points",
      "value": 100,
      "description": "Gives +100 Points"
    },
    "description": "Stands for Advanced Research and Innovation in Smart Environments. Replaced the old Life Sciences Building — only the original two-storey structural shell was kept, then expanded vertically with new labs for health tech and clean tech research."
  },
  {
    "id": "AC",
    "name": "Athletics Building",
    "lat": 45.3862338903989,
    "lng": -75.69417266,
    "powerup": {
      "type": "points",
      "value": 100,
      "description": "Gives +100 Points"
    },
    "description": "Home turf of the Carleton Ravens, whose men's basketball team has won 17 U Sports national championships — one of the most dominant programs in Canadian university sports history."
  },
  {
    "id": "AP",
    "name": "Azrieli Pavillion",
    "lat": 45.38293433480699,
    "lng": -75.69900764,
    "powerup": {
      "type": "points",
      "value": 100,
      "description": "Gives +100 Points"
    },
    "description": "Funded by David Azrieli, an Israeli-Canadian real-estate billionaire who actually studied architecture at Carleton himself before becoming a major donor."
  },
  {
    "id": "AT",
    "name": "Azrieli Theater",
    "lat": 45.38354292936509,
    "lng": -75.69830327,
    "powerup": {
      "type": "points",
      "value": 100,
      "description": "Gives +100 Points"
    },
    "description": "Also Azrieli-funded; houses several of the Architecture program's theatres (rooms 101, 102, 301, 303)."
  },
  {
    "id": "CB",
    "name": "Canal Building",
    "lat": 45.38415437433838,
    "lng": -75.69861994,
    "powerup": {
      "type": "points",
      "value": 100,
      "description": "Gives +100 Points"
    },
    "description": "Opened in 2010 as part of a major campus expansion under Carleton's first female president, Roseann Runte."
  },
  {
    "id": "TT",
    "name": "Carleton Technology & Training Center",
    "lat": 45.384559449460504,
    "lng": -75.69351665,
    "powerup": {
      "type": "points",
      "value": 100,
      "description": "Gives +100 Points"
    },
    "description": "A genuine one-stop-shop building: health services, the co-op office, a pharmacy, a dental clinic, and a café called 'Treats' all share the space."
  },
  {
    "id": "DT",
    "name": "Dunton Tower",
    "lat": 45.38271957094283,
    "lng": -75.69935633,
    "powerup": {
      "type": "points",
      "value": 100,
      "description": "Gives +100 Points"
    },
    "description": "Carleton's tallest building at 22 storeys — one of the tallest in Ottawa. Completed 1972, originally called 'Arts Tower.' Named for A. Davidson Dunton, Carleton's longest-serving president, who also chaired the CBC."
  },
  {
    "id": "FH",
    "name": "Field House",
    "lat": 45.386979798718315,
    "lng": -75.6945638,
    "powerup": {
      "type": "points",
      "value": 100,
      "description": "Gives +100 Points"
    },
    "description": "Carleton's indoor athletic field facility."
  },
  {
    "id": "FR",
    "name": "Frontenac House",
    "lat": 45.385953925017155,
    "lng": -75.69837734,
    "powerup": {
      "type": "points",
      "value": 100,
      "description": "Gives +100 Points"
    },
    "description": "One of the residence houses named after Ontario counties in the Ottawa Valley. Added in 2008; suite-style, reserved for upper-year students."
  },
  {
    "id": "GH",
    "name": "Glengarry House",
    "lat": 45.386721944985936,
    "lng": -75.6970034,
    "powerup": {
      "type": "points",
      "value": 100,
      "description": "Gives +100 Points"
    },
    "description": "Part of the same Ontario-counties residence naming set as Frontenac, Grenville, Lanark, and others."
  },
  {
    "id": "GR",
    "name": "Grenville House",
    "lat": 45.38653975784128,
    "lng": -75.69848118,
    "powerup": {
      "type": "points",
      "value": 100,
      "description": "Gives +100 Points"
    },
    "description": "Same residence set — traditional double/single rooms across four floors."
  },
  {
    "id": "HS",
    "name": "Health Sciences Building",
    "lat": 45.38325011268845,
    "lng": -75.69655324,
    "powerup": {
      "type": "points",
      "value": 100,
      "description": "Gives +100 Points"
    },
    "description": "Completed in 2018, another product of the Runte-era campus expansion."
  },
  {
    "id": "HP",
    "name": "Herzberg Building",
    "lat": 45.38217059588242,
    "lng": -75.69727665,
    "powerup": {
      "type": "points",
      "value": 100,
      "description": "Gives +100 Points"
    },
    "description": "Named for Gerhard Herzberg, Carleton's former Chancellor (1973–80) and winner of the 1971 Nobel Prize in Chemistry — Canada's first Nobel laureate in the natural sciences. His four-volume reference work on molecular spectroscopy is nicknamed 'the spectroscopist's bible.'"
  },
  {
    "id": "HC",
    "name": "Human Computer Interaction Building",
    "lat": 45.38063191490353,
    "lng": -75.69975903,
    "powerup": {
      "type": "points",
      "value": 100,
      "description": "Gives +100 Points"
    },
    "description": "Connected to the Architecture Building by an elevated catwalk for quick access between the two programs."
  },
  {
    "id": "LH",
    "name": "Lanark House",
    "lat": 45.385754242994025,
    "lng": -75.6984283,
    "powerup": {
      "type": "points",
      "value": 100,
      "description": "Gives +100 Points"
    },
    "description": "One of Carleton's first two purpose-built residences (1962), originally reserved for male students only. In 1969, Carleton became the first university in North America to switch to fully co-ed residence housing."
  },
  {
    "id": "LE",
    "name": "Leeds House",
    "lat": 45.3879259033681,
    "lng": -75.69892873,
    "powerup": {
      "type": "points",
      "value": 100,
      "description": "Gives +100 Points"
    },
    "description": "Part of the Ontario-counties residence set."
  },
  {
    "id": "LX",
    "name": "Lennox and Addington House",
    "lat": 45.38635801902504,
    "lng": -75.69718236,
    "powerup": {
      "type": "points",
      "value": 100,
      "description": "Gives +100 Points"
    },
    "description": "Residence building opened in 2011 under the Runte-era expansion."
  },
  {
    "id": "LA",
    "name": "Loeb Building",
    "lat": 45.38098355476697,
    "lng": -75.69907082,
    "powerup": {
      "type": "points",
      "value": 100,
      "description": "Gives +100 Points"
    },
    "description": "Named for Bertram Loeb, the grocery magnate who brought IGA franchises to Canada and donated $500,000 to Carleton in 1965. Home to the Music department and its instrument collection."
  },
  {
    "id": "ME",
    "name": "Mackenzie Building",
    "lat": 45.38489297734113,
    "lng": -75.69824444,
    "powerup": {
      "type": "points",
      "value": 100,
      "description": "Gives +100 Points"
    },
    "description": "Named for Chalmers Jack Mackenzie, Carleton's second chancellor — who was also the first president of Atomic Energy of Canada Limited."
  },
  {
    "id": "MA",
    "name": "MacOdrum Library",
    "lat": 45.38201067322354,
    "lng": -75.69973583,
    "powerup": {
      "type": "points",
      "value": 100,
      "description": "Gives +100 Points"
    },
    "description": "The MacOdrum Library, named in honour of Carleton’s second president Murdoch Maxwell MacOdrum, contains a collection of more than two million items—books, microfilms, tapes, CDs, government documents, maps, periodicals and archival materials—as well as study space, reading rooms and café. A computerized catalogue system provides access to the collection."
  },
  {
    "id": "MB",
    "name": "Maintenance Building",
    "lat": 45.384474146573325,
    "lng": -75.69465503,
    "powerup": {
      "type": "points",
      "value": 100,
      "description": "Gives +100 Points"
    },
    "description": "Houses Carleton's physical plant operations, including shipping and receiving."
  },
  {
    "id": "MC",
    "name": "Minto Center for Advanced Studies in Engineering",
    "lat": 45.385252755360014,
    "lng": -75.69697721,
    "powerup": {
      "type": "points",
      "value": 100,
      "description": "Gives +100 Points"
    },
    "description": "Engineering research building; also home to the Bell Theatre."
  },
  {
    "id": "NW",
    "name": "National Wildlife Research Building",
    "lat": 45.384106176780115,
    "lng": -75.69265878,
    "powerup": {
      "type": "points",
      "value": 100,
      "description": "Gives +100 Points"
    },
    "description": "Run by Environment and Climate Change Canada. Home to the National Wildlife Specimen Bank — a repository of over 12,000 wildlife specimens from across Canada."
  },
  {
    "id": "NB",
    "name": "Nesbitt Biology Building",
    "lat": 45.38400068103029,
    "lng": -75.69326764,
    "powerup": {
      "type": "points",
      "value": 100,
      "description": "Gives +100 Points"
    },
    "description": "Its climate-controlled greenhouses host an annual Butterfly Show every September/October that draws visitors from across Ottawa, not just students."
  },
  {
    "id": "NI",
    "name": "Nicol Building",
    "lat": 45.38446741376025,
    "lng": -75.69677599,
    "powerup": {
      "type": "points",
      "value": 100,
      "description": "Gives +100 Points"
    },
    "description": "Completed 2021 at a cost of $65 million, largely funded by a major donation from Wes Nicol. The new home of the Sprott School of Business."
  },
  {
    "id": "PG",
    "name": "Parking Garage",
    "lat": 45.38377514195015,
    "lng": -75.6951403,
    "powerup": {
      "type": "points",
      "value": 100,
      "description": "Gives +100 Points"
    },
    "description": "Campus parking structure."
  },
  {
    "id": "PA",
    "name": "Paterson Hall",
    "lat": 45.38192317281554,
    "lng": -75.69857911,
    "powerup": {
      "type": "points",
      "value": 100,
      "description": "Gives +100 Points"
    },
    "description": "One of the original three campus buildings (1959, alongside Tory Building and MacOdrum Library). Named for Senator Norman Paterson; originally called the 'Arts Building.' It's the only one of the original three that hasn't been significantly altered since construction — and was recently flagged in Carleton's master plan as a candidate for demolition, despite its heritage value."
  },
  {
    "id": "PH",
    "name": "Prescott House",
    "lat": 45.385681558871035,
    "lng": -75.69713786,
    "powerup": {
      "type": "points",
      "value": 100,
      "description": "Gives +100 Points"
    },
    "description": "Part of the Ontario-counties residence set."
  },
  {
    "id": "RH",
    "name": "Renfrew House",
    "lat": 45.38612075946748,
    "lng": -75.69721158,
    "powerup": {
      "type": "points",
      "value": 100,
      "description": "Gives +100 Points"
    },
    "description": "The other of Carleton's first two purpose-built residences (1962), originally reserved for female students only, alongside the male-only Lanark House."
  },
  {
    "id": "RB",
    "name": "Richcraft Hall",
    "lat": 45.38254930517843,
    "lng": -75.69630379,
    "powerup": {
      "type": "points",
      "value": 100,
      "description": "Gives +100 Points"
    },
    "description": "Originally called the 'River Building' when it opened in 2011, renamed Richcraft Hall in 2016 after a major donation from Richcraft Homes. Home to Journalism, Public Policy, and NPSIA (Norman Paterson School of International Affairs)."
  },
  {
    "id": "RI",
    "name": "Rideau House",
    "lat": 45.3883504256896,
    "lng": -75.69757396,
    "powerup": {
      "type": "points",
      "value": 100,
      "description": "Gives +100 Points"
    },
    "description": "Carleton's newest building, inaugurated in 2025 — the most recent addition to campus."
  },
  {
    "id": "RU",
    "name": "Russell House",
    "lat": 45.386944348758924,
    "lng": -75.69823775,
    "powerup": {
      "type": "points",
      "value": 100,
      "description": "Gives +100 Points"
    },
    "description": "Part of the Ontario-counties residence set."
  },
  {
    "id": "SR",
    "name": "Social Science Research Building",
    "lat": 45.38040202267615,
    "lng": -75.7000265,
    "powerup": {
      "type": "points",
      "value": 100,
      "description": "Gives +100 Points"
    },
    "description": "Not connected to the tunnel system — in winter, students are advised to route through the Loeb Building instead."
  },
  {
    "id": "SA",
    "name": "Southam Hall",
    "lat": 45.38130624179447,
    "lng": -75.69947298,
    "powerup": {
      "type": "points",
      "value": 100,
      "description": "Gives +100 Points"
    },
    "description": "Named for Harry Southam, publisher of the Ottawa Citizen and Carleton's first chancellor, who personally donated half the land the entire campus is built on. Home to Carleton's largest lecture hall, the 444-seat Kailash Mital Theatre."
  },
  {
    "id": "SP",
    "name": "St Patricks Building",
    "lat": 45.38749580574332,
    "lng": -75.69830362,
    "powerup": {
      "type": "points",
      "value": 100,
      "description": "Gives +100 Points"
    },
    "description": "Formerly Saint Patrick's College, a Catholic liberal arts college founded by the Missionary Oblates of Mary Immaculate — it became formally affiliated with Carleton in 1967."
  },
  {
    "id": "SC",
    "name": "Steacie Building",
    "lat": 45.38272914315247,
    "lng": -75.69698167,
    "powerup": {
      "type": "points",
      "value": 100,
      "description": "Gives +100 Points"
    },
    "description": "Named for E.W.R. Steacie, a distinguished chemist who chaired Carleton's board of governors and served as president of the National Research Council."
  },
  {
    "id": "SD",
    "name": "Stormont and Dundas House",
    "lat": 45.38794467403235,
    "lng": -75.69758652,
    "powerup": {
      "type": "points",
      "value": 100,
      "description": "Gives +100 Points"
    },
    "description": "Part of the Ontario-counties residence set."
  },
  {
    "id": "TD",
    "name": "Tennis Center",
    "lat": 45.38814545928469,
    "lng": -75.69439353,
    "powerup": {
      "type": "points",
      "value": 100,
      "description": "Gives +100 Points"
    },
    "description": "Campus tennis facility."
  },
  {
    "id": "TC",
    "name": "Teraanga Commons",
    "lat": 45.387131864741654,
    "lng": -75.6971582,
    "powerup": {
      "type": "points",
      "value": 100,
      "description": "Gives +100 Points"
    },
    "description": "Renamed in 2022 from 'Residence Commons' after a community-led process with African, Caribbean, and Black communities on campus. 'Teraanga' is a Senegalese Wolof word meaning sharedness and generosity of spirit. The building now features two Afrofuturist murals by artist Jimmy Baptiste."
  },
  {
    "id": "TB",
    "name": "Tory Building",
    "lat": 45.38304123447498,
    "lng": -75.69856112,
    "powerup": {
      "type": "points",
      "value": 100,
      "description": "Gives +100 Points"
    },
    "description": "The very first building on campus, built 1959. Named for Henry Marshall Tory, Carleton's founding president — who took the job unpaid."
  },
  {
    "id": "VS",
    "name": "Visualization & Simulation Building",
    "lat": 45.38045004696224,
    "lng": -75.70043691,
    "powerup": {
      "type": "points",
      "value": 100,
      "description": "Gives +100 Points"
    },
    "description": "Houses Carleton's visualization and simulation research facilities."
  }
];

module.exports = BUILDINGS;
