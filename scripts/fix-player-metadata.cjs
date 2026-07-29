const fs = require("fs");
const path = require("path");

const playersPath = path.join(process.cwd(), "src/data/players.json");
const players = JSON.parse(fs.readFileSync(playersPath, "utf8"));

// The game uses the senior national team represented by the player, not birthplace.
const nationalTeamByCanonicalPlayer = {
  "aymeric-laporte": "Espanha"
};

const normalizedNationalTeamNames = {
  Holanda: "Paises Baixos"
};

const nationalityByClubAndName = {
  "nottingham-forest-1979-80": {
    "Peter Shilton": "Inglaterra",
    "Viv Anderson": "Inglaterra",
    "Larry Lloyd": "Inglaterra",
    "Kenny Burns": "Escocia",
    "Frank Clark": "Escocia",
    "John McGovern": "Escocia",
    "Martin ONeill": "Irlanda do Norte",
    "John Robertson": "Escocia",
    "Garry Birtles": "Inglaterra",
    "Ian Bowyer": "Inglaterra",
    "Trevor Francis": "Inglaterra",
    "Tony Woodcock": "Inglaterra",
    "Archie Gemmill": "Escocia",
    "David Needham": "Inglaterra",
    "Chris Cohen": "Inglaterra"
  },
  "hamburg-1982-83": {
    "Uli Stein": "Alemanha",
    "Manfred Kaltz": "Alemanha",
    "Ditmar Jakobs": "Alemanha",
    "Holger Hieronymus": "Alemanha",
    "Bernd Wehmeyer": "Alemanha",
    "Felix Magath": "Alemanha",
    "Wolfgang Rolff": "Alemanha",
    "Jimmy Hartwig": "Alemanha",
    "Lars Bastrup": "Dinamarca",
    "Horst Hrubesch": "Alemanha",
    "Jupp Milewski": "Alemanha",
    "Thomas von Heesen": "Alemanha",
    "Caspar Memering": "Alemanha",
    "Michael Schroder": "Alemanha",
    "Lars Bengtsson": "Suecia"
  },
  "steaua-1985-86": {
    "Helmuth Duckadam": "Romenia",
    "Stefan Iovan": "Romenia",
    "Miodrag Belodedici": "Romenia",
    "Adrian Bumbescu": "Romenia",
    "Ilie Barbulescu": "Romenia",
    "Lucian Balan": "Romenia",
    "Tudorel Stoica": "Romenia",
    "Stoica": "Romenia",
    "Marius Lacatus": "Romenia",
    "Victor Piturca": "Romenia",
    "Gabi Balint": "Romenia",
    "Anghel Iordanescu": "Romenia",
    "Mihail Majearu": "Romenia",
    "Gheorghe Hagi": "Romenia",
    "Marin Radu": "Romenia"
  },
  "psv-1987-88": {
    "Hans van Breukelen": "Paises Baixos",
    "Eric Gerets": "Belgica",
    "Ronald Koeman": "Paises Baixos",
    "Ivan Nielsen": "Dinamarca",
    "Jan Heintze": "Dinamarca",
    "Soren Lerby": "Dinamarca",
    "Berry van Aerle": "Paises Baixos",
    "Gerald Vanenburg": "Paises Baixos",
    "Wim Kieft": "Paises Baixos",
    "Hans Gillhaus": "Paises Baixos",
    "Edward Linskens": "Paises Baixos",
    "Anton Janssen": "Paises Baixos",
    "Frank Arnesen": "Dinamarca",
    "Juul Ellerman": "Paises Baixos",
    "Stan Valckx": "Paises Baixos"
  },
  "red-star-1990-91": {
    "Stevan Stojanovic": "Servia",
    "Refik Sabanadzovic": "Bosnia",
    "Miodrag Belodedici": "Romenia",
    "Ilija Najdoski": "Macedonia do Norte",
    "Sinisa Mihajlovic": "Servia",
    "Vladimir Jugovic": "Servia",
    "Robert Prosinecki": "Croacia",
    "Dejan Savicevic": "Montenegro",
    "Darko Pancev": "Macedonia do Norte",
    "Dragan Stojkovic": "Servia",
    "Vladan Lukic": "Servia",
    "Milorad Ratkovic": "Servia",
    "Slobodan Marovic": "Montenegro",
    "Goran Vasilijevic": "Servia",
    "Zoran Jovicic": "Servia"
  },
  "sampdoria-1991-92": {
    "Gianluca Pagliuca": "Italia",
    "Moreno Mannini": "Italia",
    "Pietro Vierchowod": "Italia",
    "Luca Pellegrini": "Italia",
    "Amedeo Carboni": "Italia",
    "Srecko Katanec": "Eslovenia",
    "Toninho Cerezo": "Brasil",
    "Attilio Lombardo": "Italia",
    "Roberto Mancini": "Italia",
    "Gianluca Vialli": "Italia",
    "Marco Lanna": "Italia",
    "Ivano Bonetti": "Italia",
    "Fausto Pari": "Italia",
    "Giovanni Invernizzi": "Italia",
    "Renato Buso": "Italia"
  },
  "panathinaikos-1970-71": {
    "Takis Ikonomopoulos": "Grecia",
    "Kostas Eleftherakis": "Grecia",
    "Aristidis Kamaras": "Grecia",
    "Anthimos Kapsis": "Grecia",
    "Mimis Domazos": "Grecia",
    "Totis Filakouris": "Grecia",
    "Kostas Antoniadis": "Grecia",
    "Dimitris Tomaras": "Grecia",
    "Charis Grammos": "Grecia",
    "Antonis Antoniadis": "Grecia",
    "Juan Ramon Veron": "Argentina",
    "Takis Loukanidis": "Grecia",
    "Dimitris Papaioannou": "Grecia",
    "Kostas Linoxilakis": "Grecia",
    "Vasilis Konstantinou": "Grecia"
  },
  "dynamo-kyiv-1998-99": {
    "Oleksandr Shovkovskyi": "Ucrania",
    "Oleh Luzhnyi": "Ucrania",
    "Vladyslav Vashchuk": "Ucrania",
    "Yuriy Dmytrulin": "Ucrania",
    "Kakha Kaladze": "Georgia",
    "Serhiy Rebrov": "Ucrania",
    "Oleksandr Khatskevich": "Belarus",
    "Valentin Belkevich": "Belarus",
    "Andriy Husin": "Ucrania",
    "Andriy Shevchenko": "Ucrania",
    "Viktor Leonenko": "Ucrania",
    "Vitaliy Kosovskyi": "Ucrania",
    "Giorgi Demetradze": "Georgia",
    "Serhiy Fedorov": "Ucrania",
    "Oleksandr Holovko": "Ucrania"
  }
};

const playerRoleUpdates = {
  neymar: ["MEI", "LM", "CF", "RW"],
  "cristiano-ronaldo": ["ST", "CF", "RW"],
  "lionel-messi": ["MEI", "ST", "CF", "RW", "RM"],
  "kevin-de-bruyne": ["CM", "MEI"],
  "kylian-mbappe": ["ST", "LW", "CF"]
};

let changes = 0;

for (const player of players) {
  const nationalTeam = nationalTeamByCanonicalPlayer[player.canonicalPlayerId]
    ?? normalizedNationalTeamNames[player.nationality];
  if (nationalTeam && player.nationality !== nationalTeam) {
    player.nationality = nationalTeam;
    changes += 1;
  }

  const nationality = nationalityByClubAndName[player.clubSeasonId]?.[player.name];
  if (nationality && player.nationality !== nationality) {
    player.nationality = nationality;
    changes += 1;
  }

  if (player.clubSeasonId === "nottingham-forest-1979-80" && player.name === "Frank Clark") {
    player.name = "Frank Gray";
    player.shortName = "Gray";
    player.canonicalPlayerId = "frank-gray";
    player.description = player.description.replace("Frank Clark", "Frank Gray");
    changes += 1;
  }

  const roles = playerRoleUpdates[player.canonicalPlayerId];
  if (roles) {
    const nextRoles = [...new Set([...player.secondaryPositions, ...roles])]
      .filter((position) => position !== player.primaryPosition);
    if (nextRoles.join(",") !== player.secondaryPositions.join(",")) {
      player.secondaryPositions = nextRoles;
      changes += 1;
    }
  }

  if (player.clubSeasonId === "santos-1962-63" && player.name === "Pepe") {
    player.canonicalPlayerId = "pepe-santos";
  }
}

fs.writeFileSync(playersPath, `${JSON.stringify(players, null, 2)}\n`);
console.log(`Metadados corrigidos: ${changes}`);
