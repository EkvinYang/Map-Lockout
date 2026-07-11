/**
 * Campus Buildings and Powerups Configuration
 * This list is populated from the Carleton campus building CSV data.
 * Customize the coordinates (lat, lng) to match your own university campus!
 */
const BUILDINGS = [
  {
    id: "richcraft",
    name: "Richcraft Hall",
    description: "Journalism and International Affairs building.",
    lat: 45.38263922186898,
    lng: -75.69619565975236,
    powerup: {
      type: "points",
      value: 1,
      description: "Gives +1 Points"
    }
  },
  {
    id: "alumni-park",
    name: "Alumni Park",
    description: "Scenic campus park by the Rideau River.",
    lat: 45.38283623380293,
    lng: -75.69485785509715,
    powerup: {
      type: "points",
      value: 10,
      description: "Gives +10 Points"
    }
  },
  {
    id: "campus-store",
    name: "Campus Store",
    description: "Carleton University bookstore and apparel shop.",
    lat: 45.383395264680864,
    lng: -75.6974631863349,
    powerup: {
      type: "points",
      value: 100,
      description: "Gives +100 Points"
    }
  },
  {
    id: "hs",
    name: "Health Sciences Building",
    lat: 45.38353004396775,
    lng: -75.6963132456677,
    powerup: {
      type: "points",
      value: 200,
      description: "Gives +200 Points"
    },
    description: "Completed in 2018, another product of the Runte-era campus expansion."
  },
  {
    id: "ih",
    name: "Advanced Capital Ice House",
    lat: 45.3854867705603,
    lng: -75.69334965907152,
    powerup: {
      type: "points",
      value: 100,
      description: "Gives +100 Points"
    },
    description: "Also known as the Carleton Ice House on official campus maps � doubles as a library storage facility, not just an ice rink."
  },
  {
    id: "ah",
    name: "Alumni Hall",
    lat: 45.38677226703888,
    lng: -75.69287498717836,
    powerup: {
      type: "points",
      value: 100,
      description: "Gives +100 Points"
    },
    description: "Sits near Southam Hall in the historic quad area of campus."
  },
  {
    id: "af",
    name: "Andrew Fleck Childcare Centre",
    lat: 45.385621702307226,
    lng: -75.69367249749827,
    powerup: {
      type: "points",
      value: 100,
      description: "Gives +100 Points"
    },
    description: "On-campus childcare facility serving Carleton students, staff, and faculty with children."
  },
  {
    id: "aa",
    name: "Architecture Building",
    lat: 45.38415487921713,
    lng: -75.69745040252359,
    powerup: {
      type: "points",
      value: 100,
      description: "Gives +100 Points"
    },
    description: "Home of the Azrieli School of Architecture and Urbanism. Alum Paul Denham Austerberry (BArch '89) won an Academy Award for production design on Guillermo del Toro's The Shape of Water."
  },
  {
    id: "ar",
    name: "ARISE Building",
    lat: 45.381303457322765,
    lng: -75.69752043372782,
    powerup: {
      type: "points",
      value: 100,
      description: "Gives +100 Points"
    },
    description: "Stands for Advanced Research and Innovation in Smart Environments. Replaced the old Life Sciences Building � only the original two-storey structural shell was kept, then expanded vertically with new labs for health tech and clean tech research."
  },
  {
    id: "ac",
    name: "Athletics Building",
    lat: 45.38649347476524,
    lng: -75.69323163027676,
    powerup: {
      type: "points",
      value: 100,
      description: "Gives +100 Points"
    },
    description: "Home turf of the Carleton Ravens, whose men's basketball team has won 17 U Sports national championships � one of the most dominant programs in Canadian university sports history."
  },
  {
    id: "ap",
    name: "Azrieli Pavillion",
    lat: 45.38300328228717,
    lng: -75.69844347420126,
    powerup: {
      type: "points",
      value: 100,
      description: "Gives +100 Points"
    },
    description: "Funded by David Azrieli, an Israeli-Canadian real-estate billionaire who actually studied architecture at Carleton himself before becoming a major donor."
  },
  {
    id: "at",
    name: "Azrieli Theater",
    lat: 45.38354292936509,
    lng: -75.69830327420118,
    powerup: {
      type: "points",
      value: 100,
      description: "Gives +100 Points"
    },
    description: "Also Azrieli-funded; houses several of the Architecture program's theatres (rooms 101, 102, 301, 303)."
  },
  {
    id: "cb",
    name: "Canal Building",
    lat: 45.38415709590767,
    lng: -75.69837569696183,
    powerup: {
      type: "points",
      value: 100,
      description: "Gives +100 Points"
    },
    description: "Opened in 2010 as part of a major campus expansion under Carleton's first female president, Roseann Runte."
  },
  {
    id: "tt",
    name: "Carleton Technology & Training Center",
    lat: 45.38465790717772,
    lng: -75.69268456493175,
    powerup: {
      type: "points",
      value: 100,
      description: "Gives +100 Points"
    },
    description: "A genuine one-stop-shop building: health services, the co-op office, a pharmacy, a dental clinic, and a caf� called 'Treats' all share the space."
  },
  {
    id: "dt",
    name: "Dunton Tower",
    lat: 45.38279554724297,
    lng: -75.69891009140035,
    powerup: {
      type: "points",
      value: 100,
      description: "Gives +100 Points"
    },
    description: "Carleton's tallest building at 22 storeys � one of the tallest in Ottawa. Completed 1972, originally called 'Arts Tower.' Named for A. Davidson Dunton, Carleton's longest-serving president, who also chaired the CBC."
  },
  {
    id: "fh",
    name: "Field House",
    lat: 45.38700585825397,
    lng: -75.69415431019593,
    powerup: {
      type: "points",
      value: 100,
      description: "Gives +100 Points"
    },
    description: "Carleton's indoor athletic field facility."
  },
  {
    id: "fr",
    name: "Frontenac House",
    lat: 45.386230814253246,
    lng: -75.69835320252336,
    powerup: {
      type: "points",
      value: 100,
      description: "Gives +100 Points"
    },
    description: "One of the residence houses named after Ontario counties in the Ottawa Valley. Added in 2008; suite-style, reserved for upper-year students."
  },
  {
    id: "gh",
    name: "Glengarry House",
    lat: 45.386721944985936,
    lng: -75.6970033952905,
    powerup: {
      type: "points",
      value: 100,
      description: "Gives +100 Points"
    },
    description: "Part of the same Ontario-counties residence naming set as Frontenac, Grenville, Lanark, and others."
  },
  {
    id: "gr",
    name: "Grenville House",
    lat: 45.38653975784128,
    lng: -75.69848118049437,
    powerup: {
      type: "points",
      value: 100,
      description: "Gives +100 Points"
    },
    description: "Same residence set � traditional double/single rooms across four floors."
  },
  {
    id: "hp",
    name: "Herzberg Building",
    lat: 45.38217059588242,
    lng: -75.69727664897395,
    powerup: {
      type: "points",
      value: 100,
      description: "Gives +100 Points"
    },
    description: "Named for Gerhard Herzberg, Carleton's former Chancellor (1973�80) and winner of the 1971 Nobel Prize in Chemistry � Canada's first Nobel laureate in the natural sciences. His four-volume reference work on molecular spectroscopy is nicknamed 'the spectroscopist's bible.'"
  },
  {
    id: "hc",
    name: "Human Computer Interaction Building",
    lat: 45.380885061711986,
    lng: -75.69921793187392,
    powerup: {
      type: "points",
      value: 100,
      description: "Gives +100 Points"
    },
    description: "Connected to the Architecture Building by an elevated catwalk for quick access between the two programs."
  },
  {
    id: "lh",
    name: "Lanark House",
    lat: 45.38581385807013,
    lng: -75.69755097420116,
    powerup: {
      type: "points",
      value: 100,
      description: "Gives +100 Points"
    },
    description: "One of Carleton's first two purpose-built residences (1962), originally reserved for male students only. In 1969, Carleton became the first university in North America to switch to fully co-ed residence housing."
  },
  {
    id: "le",
    name: "Leeds House",
    lat: 45.38808985938852,
    lng: -75.69824073187355,
    powerup: {
      type: "points",
      value: 100,
      description: "Gives +100 Points"
    },
    description: "Part of the Ontario-counties residence set."
  },
  {
    id: "lx",
    name: "Lennox and Addington House",
    lat: 45.38652319212302,
    lng: -75.69670538954621,
    powerup: {
      type: "points",
      value: 100,
      description: "Gives +100 Points"
    },
    description: "Residence building opened in 2011 under the Runte-era expansion."
  },
  {
    id: "la",
    name: "Loeb Building",
    lat: 45.38098838014505,
    lng: -75.69822957790906,
    powerup: {
      type: "points",
      value: 100,
      description: "Gives +100 Points"
    },
    description: "Named for Bertram Loeb, the grocery magnate who brought IGA franchises to Canada and donated $500,000 to Carleton in 1965. Home to the Music department and its instrument collection."
  },
  {
    id: "me",
    name: "Mackenzie Building",
    lat: 45.38489297734113,
    lng: -75.6982444367943,
    powerup: {
      type: "points",
      value: 100,
      description: "Gives +100 Points"
    },
    description: "Named for Chalmers Jack Mackenzie, Carleton's second chancellor � who was also the first president of Atomic Energy of Canada Limited."
  },
  {
    id: "mb",
    name: "Maintenance Building",
    lat: 45.38449106984768,
    lng: -75.69452741526024,
    powerup: {
      type: "points",
      value: 100,
      description: "Gives +100 Points"
    },
    description: "Houses Carleton's physical plant operations, including shipping and receiving."
  },
  {
    id: "mc",
    name: "Minto Center for Advanced Studies in Engineering",
    lat: 45.385321740845356,
    lng: -75.69692938717827,
    powerup: {
      type: "points",
      value: 100,
      description: "Gives +100 Points"
    },
    description: "Engineering research building; also home to the Bell Theatre."
  },
  {
    id: "nw",
    name: "National Wildlife Research Building",
    lat: 45.38413654137956,
    lng: -75.69237026814997,
    powerup: {
      type: "points",
      value: 100,
      description: "Gives +100 Points"
    },
    description: "Run by Environment and Climate Change Canada. Home to the National Wildlife Specimen Bank � a repository of over 12,000 wildlife specimens from across Canada."
  },
  {
    id: "nb",
    name: "Nesbitt Biology Building",
    lat: 45.38410068755634,
    lng: -75.6932719430303,
    powerup: {
      type: "points",
      value: 100,
      description: "Gives +100 Points"
    },
    description: "Its climate-controlled greenhouses host an annual Butterfly Show every September/October that draws visitors from across Ottawa, not just students."
  },
  {
    id: "ni",
    name: "Nicol Building",
    lat: 45.38446741376025,
    lng: -75.69677598717843,
    powerup: {
      type: "points",
      value: 100,
      description: "Gives +100 Points"
    },
    description: "Completed 2021 at a cost of $65 million, largely funded by a major donation from Wes Nicol. The new home of the Sprott School of Business."
  },
  {
    id: "pg",
    name: "Parking Garage",
    lat: 45.38377514195015,
    lng: -75.69514030372933,
    powerup: {
      type: "points",
      value: 100,
      description: "Gives +100 Points"
    },
    description: "Campus parking structure."
  },
  {
    id: "pa",
    name: "Paterson Hall",
    lat: 45.38191376957529,
    lng: -75.69834520991955,
    powerup: {
      type: "points",
      value: 100,
      description: "Gives +100 Points"
    },
    description: "One of the original three campus buildings (1959, alongside Tory Building and MacOdrum Library). Named for Senator Norman Paterson; originally called the 'Arts Building.' It's the only one of the original three that hasn't been significantly altered since construction � and was recently flagged in Carleton's master plan as a candidate for demolition, despite its heritage value."
  },
  {
    id: "ph",
    name: "Prescott House",
    lat: 45.385681558871035,
    lng: -75.6971378644415,
    powerup: {
      type: "points",
      value: 100,
      description: "Gives +100 Points"
    },
    description: "Part of the Ontario-counties residence set."
  },
  {
    id: "rh",
    name: "Renfrew House",
    lat: 45.386226013713326,
    lng: -75.69716694437936,
    powerup: {
      type: "points",
      value: 100,
      description: "Gives +100 Points"
    },
    description: "The other of Carleton's first two purpose-built residences (1962), originally reserved for female students only, alongside the male-only Lanark House."
  },
  {
    id: "ri",
    name: "Rideau House",
    lat: 45.3883504256896,
    lng: -75.69757396360309,
    powerup: {
      type: "points",
      value: 100,
      description: "Gives +100 Points"
    },
    description: "Carleton's newest building, inaugurated in 2025 � the most recent addition to campus."
  },
  {
    id: "ru",
    name: "Russell House",
    lat: 45.386944348758924,
    lng: -75.6982377460348,
    powerup: {
      type: "points",
      value: 100,
      description: "Gives +100 Points"
    },
    description: "Part of the Ontario-counties residence set."
  },
  {
    id: "sr",
    name: "Social Science Research Building",
    lat: 45.38061610400263,
    lng: -75.69995664485118,
    powerup: {
      type: "points",
      value: 100,
      description: "Gives +100 Points"
    },
    description: "Not connected to the tunnel system � in winter, students are advised to route through the Loeb Building instead."
  },
  {
    id: "sa",
    name: "Southam Hall",
    lat: 45.38130624179447,
    lng: -75.69947297875585,
    powerup: {
      type: "points",
      value: 100,
      description: "Gives +100 Points"
    },
    description: "Named for Harry Southam, publisher of the Ottawa Citizen and Carleton's first chancellor, who personally donated half the land the entire campus is built on. Home to Carleton's largest lecture hall, the 444-seat Kailash Mital Theatre."
  },
  {
    id: "sp",
    name: "St Patricks Building",
    lat: 45.38762910490989,
    lng: -75.69825267368708,
    powerup: {
      type: "points",
      value: 100,
      description: "Gives +100 Points"
    },
    description: "Formerly Saint Patrick's College, a Catholic liberal arts college founded by the Missionary Oblates of Mary Immaculate � it became formally affiliated with Carleton in 1967."
  },
  {
    id: "sc",
    name: "Steacie Building",
    lat: 45.38289540466157,
    lng: -75.69638621838268,
    powerup: {
      type: "points",
      value: 100,
      description: "Gives +100 Points"
    },
    description: "Named for E.W.R. Steacie, a distinguished chemist who chaired Carleton's board of governors and served as president of the National Research Council."
  },
  {
    id: "sd",
    name: "Stormont and Dundas House",
    lat: 45.38794467403235,
    lng: -75.69758652118671,
    powerup: {
      type: "points",
      value: 100,
      description: "Gives +100 Points"
    },
    description: "Part of the Ontario-counties residence set."
  },
  {
    id: "td",
    name: "Tennis Center",
    lat: 45.38814545928469,
    lng: -75.69439353187357,
    powerup: {
      type: "points",
      value: 100,
      description: "Gives +100 Points"
    },
    description: "Campus tennis facility."
  },
  {
    id: "tc",
    name: "Teraanga Commons",
    lat: 45.387009466501475,
    lng: -75.6961080048912,
    powerup: {
      type: "points",
      value: 100,
      description: "Gives +100 Points"
    },
    description: "Renamed in 2022 from 'Residence Commons' after a community-led process with African, Caribbean, and Black communities on campus. 'Teraanga' is a Senegalese Wolof word meaning sharedness and generosity of spirit. The building now features two Afrofuturist murals by artist Jimmy Baptiste."
  },
  {
    id: "tb",
    name: "Tory Building",
    lat: 45.38296851950298,
    lng: -75.69791297607759,
    powerup: {
      type: "points",
      value: 100,
      description: "Gives +100 Points"
    },
    description: "The very first building on campus, built 1959. Named for Henry Marshall Tory, Carleton's founding president � who took the job unpaid."
  },
  {
    id: "vs",
    name: "Visualization & Simulation Building",
    lat: 45.380735560080495,
    lng: -75.7002048871785,
    powerup: {
      type: "points",
      value: 100,
      description: "Gives +100 Points"
    },
    description: "Houses Carleton's visualization and simulation research facilities."
  }
];

module.exports = BUILDINGS;
