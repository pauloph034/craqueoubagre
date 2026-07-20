$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$dataDir = Join-Path $root "src\data"
New-Item -ItemType Directory -Force -Path $dataDir | Out-Null

$seasons = @(
  @("barcelona-2010-11","barcelona","Barcelona","BAR","Espanha","2010/11","#8a1538","#004d98","crest","Campeao", $true,"lendaria","Elenco tecnico, associativo e dominante em uma noite europeia inesquecivel."),
  @("real-madrid-2016-17","real-madrid","Real Madrid","RMA","Espanha","2016/17","#f5f5f5","#6d3cff","shield","Campeao", $true,"lendaria","Time de finais grandes, repertorio ofensivo e controle emocional."),
  @("milan-2006-07","milan","Milan","MIL","Italia","2006/07","#c8102e","#111111","shield","Campeao", $true,"lendaria","Veteranos brilhantes, meio-campo cerebral e noites de revanche."),
  @("bayern-2019-20","bayern","Bayern de Munique","BAY","Alemanha","2019/20","#dc052d","#0066b2","round","Campeao", $true,"lendaria","Pressao intensa, gols em serie e uma campanha de alto impacto."),
  @("man-united-2007-08","man-united","Manchester United","MUN","Inglaterra","2007/08","#da291c","#fbe122","crest","Campeao", $true,"epica","Equipe vertical, forte em transicao e decisiva nos grandes jogos."),
  @("liverpool-2018-19","liverpool","Liverpool","LIV","Inglaterra","2018/19","#c8102e","#00b2a9","shield","Campeao", $true,"epica","Pressao coordenada, laterais criativos e ataque de alta rotaÃ§Ã£o."),
  @("chelsea-2020-21","chelsea","Chelsea","CHE","Inglaterra","2020/21","#034694","#ffffff","round","Campeao", $true,"epica","Bloco compacto, eficiencia em mata-mata e defesa muito confiavel."),
  @("inter-2009-10","inter","Internazionale","INT","Italia","2009/10","#0057b8","#111111","round","Campeao", $true,"epica","Equipe pragmatica, fisica e mortal em transicoes."),
  @("porto-2003-04","porto","Porto","POR","Portugal","2003/04","#0055a4","#ffffff","crest","Campeao", $true,"rara","Elenco disciplinado, coletivo e com enorme competitividade."),
  @("ajax-1994-95","ajax","Ajax","AJA","Paises Baixos","1994/95","#d2122e","#ffffff","round","Campeao", $true,"rara","Juventude tecnica, ocupacao inteligente de espacos e coragem."),
  @("juventus-1995-96","juventus","Juventus","JUV","Italia","1995/96","#ffffff","#111111","shield","Campeao", $true,"rara","Time competitivo, equilibrado e acostumado a jogos tensos."),
  @("dortmund-1996-97","dortmund","Borussia Dortmund","BVB","Alemanha","1996/97","#fde100","#111111","diamond","Campeao", $true,"rara","Energia, marcacao forte e ataques bem coordenados."),
  @("arsenal-2005-06","arsenal","Arsenal","ARS","Inglaterra","2005/06","#ef0107","#dbb21a","crest","Finalista", $false,"comum","Campanha de resistencia defensiva e talento nos metros finais."),
  @("atletico-2015-16","atletico","Atletico de Madrid","ATM","Espanha","2015/16","#cb3524","#272e61","shield","Finalista", $false,"comum","Organizacao defensiva, intensidade e bola parada forte."),
  @("psg-2019-20","psg","Paris Saint-Germain","PSG","Franca","2019/20","#004170","#da291c","round","Finalista", $false,"comum","Ataque tecnico, velocidade e talento individual em destaque."),
  @("valencia-2000-01","valencia","Valencia","VAL","Espanha","2000/01","#f36f21","#111111","diamond","Finalista", $false,"comum","Time competitivo, compacto e acostumado a decisoes europeias.")
)

$positions = @(
  @("GK","Goleiro",1), @("RB","Lateral D",2), @("CB","Zagueiro A",4), @("CB","Zagueiro B",5), @("LB","Lateral E",3),
  @("DM","Volante",6), @("CM","Meia Central",8), @("MEI","Armador",10), @("RW","Ponta D",7), @("LW","Ponta E",11),
  @("ST","Centroavante",9), @("CF","Segundo Atacante",19), @("RM","Meia D",14), @("LM","Meia E",15), @("CM","Motor",16)
)

$realPlayers = @{
  "barcelona-2010-11" = @(
    @("Victor Valdes","Valdes","Espanha"), @("Dani Alves","Dani Alves","Brasil"), @("Gerard Pique","Pique","Espanha"), @("Carles Puyol","Puyol","Espanha"), @("Eric Abidal","Abidal","Franca"),
    @("Sergio Busquets","Busquets","Espanha"), @("Xavi","Xavi","Espanha"), @("Lionel Messi","Messi","Argentina"), @("Pedro","Pedro","Espanha"), @("David Villa","Villa","Espanha"),
    @("Bojan Krkic","Bojan","Espanha"), @("Andres Iniesta","Iniesta","Espanha"), @("Adriano","Adriano","Brasil"), @("Seydou Keita","Keita","Mali"), @("Javier Mascherano","Mascherano","Argentina")
  )
  "real-madrid-2016-17" = @(
    @("Keylor Navas","Navas","Costa Rica"), @("Dani Carvajal","Carvajal","Espanha"), @("Sergio Ramos","Ramos","Espanha"), @("Raphael Varane","Varane","Franca"), @("Marcelo","Marcelo","Brasil"),
    @("Casemiro","Casemiro","Brasil"), @("Toni Kroos","Kroos","Alemanha"), @("Luka Modric","Modric","Croacia"), @("Gareth Bale","Bale","Pais de Gales"), @("Marco Asensio","Asensio","Espanha"),
    @("Karim Benzema","Benzema","Franca"), @("Cristiano Ronaldo","Ronaldo","Portugal"), @("Lucas Vazquez","Vazquez","Espanha"), @("Isco","Isco","Espanha"), @("Mateo Kovacic","Kovacic","Croacia")
  )
  "milan-2006-07" = @(
    @("Dida","Dida","Brasil"), @("Massimo Oddo","Oddo","Italia"), @("Alessandro Nesta","Nesta","Italia"), @("Paolo Maldini","Maldini","Italia"), @("Marek Jankulovski","Jankulovski","Republica Tcheca"),
    @("Gennaro Gattuso","Gattuso","Italia"), @("Andrea Pirlo","Pirlo","Italia"), @("Kaka","Kaka","Brasil"), @("Clarence Seedorf","Seedorf","Paises Baixos"), @("Alberto Gilardino","Gilardino","Italia"),
    @("Filippo Inzaghi","Inzaghi","Italia"), @("Ronaldo","Ronaldo","Brasil"), @("Massimo Ambrosini","Ambrosini","Italia"), @("Serginho","Serginho","Brasil"), @("Yoann Gourcuff","Gourcuff","Franca")
  )
  "bayern-2019-20" = @(
    @("Manuel Neuer","Neuer","Alemanha"), @("Benjamin Pavard","Pavard","Franca"), @("Jerome Boateng","Boateng","Alemanha"), @("David Alaba","Alaba","Austria"), @("Alphonso Davies","Davies","Canada"),
    @("Joshua Kimmich","Kimmich","Alemanha"), @("Thiago Alcantara","Thiago","Espanha"), @("Thomas Muller","Muller","Alemanha"), @("Serge Gnabry","Gnabry","Alemanha"), @("Kingsley Coman","Coman","Franca"),
    @("Robert Lewandowski","Lewandowski","Polonia"), @("Philippe Coutinho","Coutinho","Brasil"), @("Ivan Perisic","Perisic","Croacia"), @("Leon Goretzka","Goretzka","Alemanha"), @("Corentin Tolisso","Tolisso","Franca")
  )
  "man-united-2007-08" = @(
    @("Edwin van der Sar","Van der Sar","Paises Baixos"), @("Wes Brown","Brown","Inglaterra"), @("Rio Ferdinand","Ferdinand","Inglaterra"), @("Nemanja Vidic","Vidic","Servia"), @("Patrice Evra","Evra","Franca"),
    @("Michael Carrick","Carrick","Inglaterra"), @("Paul Scholes","Scholes","Inglaterra"), @("Wayne Rooney","Rooney","Inglaterra"), @("Cristiano Ronaldo","Ronaldo","Portugal"), @("Ryan Giggs","Giggs","Pais de Gales"),
    @("Carlos Tevez","Tevez","Argentina"), @("Nani","Nani","Portugal"), @("Owen Hargreaves","Hargreaves","Inglaterra"), @("Park Ji-sung","Park","Coreia do Sul"), @("Darren Fletcher","Fletcher","Escocia")
  )
  "liverpool-2018-19" = @(
    @("Alisson","Alisson","Brasil"), @("Trent Alexander-Arnold","Alexander-Arnold","Inglaterra"), @("Virgil van Dijk","Van Dijk","Paises Baixos"), @("Joel Matip","Matip","Camaroes"), @("Andrew Robertson","Robertson","Escocia"),
    @("Fabinho","Fabinho","Brasil"), @("Jordan Henderson","Henderson","Inglaterra"), @("Roberto Firmino","Firmino","Brasil"), @("Mohamed Salah","Salah","Egito"), @("Sadio Mane","Mane","Senegal"),
    @("Divock Origi","Origi","Belgica"), @("Xherdan Shaqiri","Shaqiri","Suica"), @("James Milner","Milner","Inglaterra"), @("Georginio Wijnaldum","Wijnaldum","Paises Baixos"), @("Naby Keita","Keita","Guine")
  )
  "chelsea-2020-21" = @(
    @("Edouard Mendy","Mendy","Senegal"), @("Reece James","James","Inglaterra"), @("Thiago Silva","Thiago Silva","Brasil"), @("Antonio Rudiger","Rudiger","Alemanha"), @("Ben Chilwell","Chilwell","Inglaterra"),
    @("N'Golo Kante","Kante","Franca"), @("Jorginho","Jorginho","Italia"), @("Mason Mount","Mount","Inglaterra"), @("Hakim Ziyech","Ziyech","Marrocos"), @("Christian Pulisic","Pulisic","Estados Unidos"),
    @("Timo Werner","Werner","Alemanha"), @("Kai Havertz","Havertz","Alemanha"), @("Cesar Azpilicueta","Azpilicueta","Espanha"), @("Mateo Kovacic","Kovacic","Croacia"), @("Callum Hudson-Odoi","Hudson-Odoi","Inglaterra")
  )
  "inter-2009-10" = @(
    @("Julio Cesar","Julio Cesar","Brasil"), @("Maicon","Maicon","Brasil"), @("Lucio","Lucio","Brasil"), @("Walter Samuel","Samuel","Argentina"), @("Cristian Chivu","Chivu","Romenia"),
    @("Esteban Cambiasso","Cambiasso","Argentina"), @("Javier Zanetti","Zanetti","Argentina"), @("Wesley Sneijder","Sneijder","Paises Baixos"), @("Samuel Eto'o","Eto'o","Camaroes"), @("Goran Pandev","Pandev","Macedonia do Norte"),
    @("Diego Milito","Milito","Argentina"), @("Mario Balotelli","Balotelli","Italia"), @("Dejan Stankovic","Stankovic","Servia"), @("Thiago Motta","Motta","Italia"), @("Sulley Muntari","Muntari","Gana")
  )
  "porto-2003-04" = @(
    @("Vitor Baia","Baia","Portugal"), @("Paulo Ferreira","Ferreira","Portugal"), @("Ricardo Carvalho","Carvalho","Portugal"), @("Jorge Costa","Jorge Costa","Portugal"), @("Nuno Valente","Valente","Portugal"),
    @("Costinha","Costinha","Portugal"), @("Maniche","Maniche","Portugal"), @("Deco","Deco","Portugal"), @("Carlos Alberto","Carlos Alberto","Brasil"), @("Derlei","Derlei","Brasil"),
    @("Benni McCarthy","McCarthy","Africa do Sul"), @("Dmitri Alenichev","Alenichev","Russia"), @("Pedro Mendes","Mendes","Portugal"), @("Marco Ferreira","Marco Ferreira","Portugal"), @("Bosingwa","Bosingwa","Portugal")
  )
  "ajax-1994-95" = @(
    @("Edwin van der Sar","Van der Sar","Paises Baixos"), @("Michael Reiziger","Reiziger","Paises Baixos"), @("Frank de Boer","Frank de Boer","Paises Baixos"), @("Danny Blind","Blind","Paises Baixos"), @("Winston Bogarde","Bogarde","Paises Baixos"),
    @("Edgar Davids","Davids","Paises Baixos"), @("Clarence Seedorf","Seedorf","Paises Baixos"), @("Jari Litmanen","Litmanen","Finlandia"), @("Finidi George","Finidi","Nigeria"), @("Marc Overmars","Overmars","Paises Baixos"),
    @("Patrick Kluivert","Kluivert","Paises Baixos"), @("Ronald de Boer","Ronald de Boer","Paises Baixos"), @("Nwankwo Kanu","Kanu","Nigeria"), @("Frank Rijkaard","Rijkaard","Paises Baixos"), @("Peter van Vossen","Van Vossen","Paises Baixos")
  )
  "juventus-1995-96" = @(
    @("Angelo Peruzzi","Peruzzi","Italia"), @("Moreno Torricelli","Torricelli","Italia"), @("Ciro Ferrara","Ferrara","Italia"), @("Pietro Vierchowod","Vierchowod","Italia"), @("Gianluca Pessotto","Pessotto","Italia"),
    @("Didier Deschamps","Deschamps","Franca"), @("Antonio Conte","Conte","Italia"), @("Alessandro Del Piero","Del Piero","Italia"), @("Angelo Di Livio","Di Livio","Italia"), @("Fabrizio Ravanelli","Ravanelli","Italia"),
    @("Gianluca Vialli","Vialli","Italia"), @("Michele Padovano","Padovano","Italia"), @("Paulo Sousa","Paulo Sousa","Portugal"), @("Vladimir Jugovic","Jugovic","Servia"), @("Sergio Porrini","Porrini","Italia")
  )
  "dortmund-1996-97" = @(
    @("Stefan Klos","Klos","Alemanha"), @("Stefan Reuter","Reuter","Alemanha"), @("Jurgen Kohler","Kohler","Alemanha"), @("Matthias Sammer","Sammer","Alemanha"), @("Jorg Heinrich","Heinrich","Alemanha"),
    @("Paul Lambert","Lambert","Escocia"), @("Andreas Moller","Moller","Alemanha"), @("Lars Ricken","Ricken","Alemanha"), @("Karl-Heinz Riedle","Riedle","Alemanha"), @("Stephane Chapuisat","Chapuisat","Suica"),
    @("Heiko Herrlich","Herrlich","Alemanha"), @("Paulo Sousa","Paulo Sousa","Portugal"), @("Michael Zorc","Zorc","Alemanha"), @("Rene Tretschok","Tretschok","Alemanha"), @("Julio Cesar","Julio Cesar","Brasil")
  )
  "arsenal-2005-06" = @(
    @("Jens Lehmann","Lehmann","Alemanha"), @("Emmanuel Eboue","Eboue","Costa do Marfim"), @("Kolo Toure","Toure","Costa do Marfim"), @("Sol Campbell","Campbell","Inglaterra"), @("Ashley Cole","Cole","Inglaterra"),
    @("Gilberto Silva","Gilberto","Brasil"), @("Cesc Fabregas","Fabregas","Espanha"), @("Robert Pires","Pires","Franca"), @("Freddie Ljungberg","Ljungberg","Suecia"), @("Jose Antonio Reyes","Reyes","Espanha"),
    @("Thierry Henry","Henry","Franca"), @("Dennis Bergkamp","Bergkamp","Paises Baixos"), @("Alexander Hleb","Hleb","Belarus"), @("Mathieu Flamini","Flamini","Franca"), @("Robin van Persie","Van Persie","Paises Baixos")
  )
  "atletico-2015-16" = @(
    @("Jan Oblak","Oblak","Eslovenia"), @("Juanfran","Juanfran","Espanha"), @("Diego Godin","Godin","Uruguai"), @("Jose Maria Gimenez","Gimenez","Uruguai"), @("Filipe Luis","Filipe Luis","Brasil"),
    @("Gabi","Gabi","Espanha"), @("Koke","Koke","Espanha"), @("Antoine Griezmann","Griezmann","Franca"), @("Angel Correa","Correa","Argentina"), @("Yannick Carrasco","Carrasco","Belgica"),
    @("Fernando Torres","Torres","Espanha"), @("Saul Niguez","Saul","Espanha"), @("Augusto Fernandez","Augusto","Argentina"), @("Oliver Torres","Oliver","Espanha"), @("Luciano Vietto","Vietto","Argentina")
  )
  "psg-2019-20" = @(
    @("Keylor Navas","Navas","Costa Rica"), @("Thilo Kehrer","Kehrer","Alemanha"), @("Thiago Silva","Thiago Silva","Brasil"), @("Marquinhos","Marquinhos","Brasil"), @("Juan Bernat","Bernat","Espanha"),
    @("Idrissa Gueye","Gueye","Senegal"), @("Marco Verratti","Verratti","Italia"), @("Neymar","Neymar","Brasil"), @("Angel Di Maria","Di Maria","Argentina"), @("Kylian Mbappe","Mbappe","Franca"),
    @("Mauro Icardi","Icardi","Argentina"), @("Edinson Cavani","Cavani","Uruguai"), @("Pablo Sarabia","Sarabia","Espanha"), @("Leandro Paredes","Paredes","Argentina"), @("Ander Herrera","Herrera","Espanha")
  )
  "valencia-2000-01" = @(
    @("Santiago Canizares","Canizares","Espanha"), @("Jocelyn Angloma","Angloma","Franca"), @("Mauricio Pellegrino","Pellegrino","Argentina"), @("Roberto Ayala","Ayala","Argentina"), @("Amedeo Carboni","Carboni","Italia"),
    @("David Albelda","Albelda","Espanha"), @("Ruben Baraja","Baraja","Espanha"), @("Pablo Aimar","Aimar","Argentina"), @("Kily Gonzalez","Kily","Argentina"), @("Vicente","Vicente","Espanha"),
    @("John Carew","Carew","Noruega"), @("Juan Sanchez","Juan Sanchez","Espanha"), @("Gaizka Mendieta","Mendieta","Espanha"), @("Miguel Angulo","Angulo","Espanha"), @("Didier Deschamps","Deschamps","Franca")
  )
}

$nationalities = @("Brasil","Argentina","Espanha","Franca","Italia","Alemanha","Portugal","Inglaterra","Paises Baixos","Uruguai","Croacia","Costa do Marfim")
$playerProfiles = @{
  "Lionel Messi" = @{pos="RW"; secondary=@("CF","ST","MEI"); overall=98; pace=92; shooting=96; passing=95; dribbling=99; defending=38; physical=72}
  "Cristiano Ronaldo" = @{pos="LW"; secondary=@("ST","RW","CF"); overall=97; pace=94; shooting=97; passing=86; dribbling=94; defending=42; physical=86}
  "Xavi" = @{pos="CM"; secondary=@("MEI","DM"); overall=96; pace=74; shooting=82; passing=98; dribbling=94; defending=72; physical=72}
  "Andres Iniesta" = @{pos="CM"; secondary=@("MEI","LW"); overall=95; pace=80; shooting=82; passing=96; dribbling=97; defending=65; physical=68}
  "Dani Alves" = @{pos="RB"; secondary=@("RWB","RM"); overall=93; pace=88; shooting=78; passing=90; dribbling=90; defending=84; physical=80}
  "Sergio Busquets" = @{pos="DM"; secondary=@("CM"); overall=92; pace=64; shooting=68; passing=91; dribbling=88; defending=90; physical=82}
  "Kaka" = @{pos="MEI"; secondary=@("CF","CM"); overall=94; pace=88; shooting=91; passing=91; dribbling=94; defending=48; physical=78}
  "Andrea Pirlo" = @{pos="CM"; secondary=@("DM","MEI"); overall=93; pace=68; shooting=82; passing=97; dribbling=88; defending=72; physical=70}
  "Paolo Maldini" = @{pos="CB"; secondary=@("LB"); overall=94; pace=78; shooting=58; passing=82; dribbling=76; defending=96; physical=86}
  "Robert Lewandowski" = @{pos="ST"; secondary=@("CF"); overall=96; pace=80; shooting=96; passing=82; dribbling=88; defending=45; physical=88}
  "Manuel Neuer" = @{pos="GK"; secondary=@(); overall=95; pace=65; shooting=30; passing=78; dribbling=58; defending=45; physical=86; goalkeeping=96}
  "Thomas Muller" = @{pos="CF"; secondary=@("MEI","ST","RM"); overall=91; pace=78; shooting=89; passing=86; dribbling=84; defending=62; physical=80}
  "Wayne Rooney" = @{pos="CF"; secondary=@("ST","MEI"); overall=93; pace=84; shooting=92; passing=88; dribbling=89; defending=68; physical=90}
  "Carlos Tevez" = @{pos="ST"; secondary=@("CF","RW"); overall=91; pace=84; shooting=90; passing=82; dribbling=89; defending=60; physical=88}
  "Mohamed Salah" = @{pos="RW"; secondary=@("ST","LW"); overall=93; pace=94; shooting=91; passing=84; dribbling=92; defending=45; physical=78}
  "Sadio Mane" = @{pos="LW"; secondary=@("RW","ST"); overall=92; pace=94; shooting=88; passing=82; dribbling=91; defending=50; physical=80}
  "Virgil van Dijk" = @{pos="CB"; secondary=@(); overall=95; pace=78; shooting=60; passing=78; dribbling=74; defending=97; physical=94}
  "Alisson" = @{pos="GK"; secondary=@(); overall=92; pace=58; shooting=28; passing=72; dribbling=52; defending=42; physical=84; goalkeeping=94}
  "N'Golo Kante" = @{pos="DM"; secondary=@("CM"); overall=93; pace=82; shooting=70; passing=84; dribbling=86; defending=94; physical=86}
  "Wesley Sneijder" = @{pos="MEI"; secondary=@("CM","CF"); overall=93; pace=78; shooting=91; passing=92; dribbling=90; defending=58; physical=76}
  "Samuel Eto'o" = @{pos="RW"; secondary=@("ST","CF"); overall=92; pace=92; shooting=90; passing=80; dribbling=88; defending=55; physical=82}
  "Diego Milito" = @{pos="ST"; secondary=@("CF"); overall=91; pace=78; shooting=91; passing=78; dribbling=84; defending=42; physical=84}
  "Deco" = @{pos="MEI"; secondary=@("CM"); overall=91; pace=76; shooting=84; passing=92; dribbling=91; defending=62; physical=74}
  "Jari Litmanen" = @{pos="MEI"; secondary=@("CF"); overall=91; pace=76; shooting=88; passing=90; dribbling=89; defending=48; physical=74}
  "Patrick Kluivert" = @{pos="ST"; secondary=@("CF"); overall=90; pace=82; shooting=88; passing=80; dribbling=85; defending=45; physical=86}
  "Alessandro Del Piero" = @{pos="CF"; secondary=@("ST","MEI","LW"); overall=93; pace=82; shooting=92; passing=89; dribbling=93; defending=44; physical=74}
  "Gianluca Vialli" = @{pos="ST"; secondary=@("CF"); overall=90; pace=80; shooting=89; passing=78; dribbling=82; defending=48; physical=86}
  "Matthias Sammer" = @{pos="CB"; secondary=@("DM"); overall=92; pace=78; shooting=72; passing=86; dribbling=82; defending=92; physical=86}
  "Thierry Henry" = @{pos="ST"; secondary=@("LW","CF"); overall=95; pace=94; shooting=94; passing=84; dribbling=93; defending=42; physical=82}
  "Dennis Bergkamp" = @{pos="CF"; secondary=@("MEI","ST"); overall=91; pace=76; shooting=88; passing=91; dribbling=91; defending=42; physical=74}
  "Antoine Griezmann" = @{pos="CF"; secondary=@("ST","MEI","RW"); overall=91; pace=84; shooting=89; passing=86; dribbling=89; defending=62; physical=78}
  "Jan Oblak" = @{pos="GK"; secondary=@(); overall=93; pace=50; shooting=25; passing=60; dribbling=45; defending=40; physical=84; goalkeeping=95}
  "Neymar" = @{pos="LW"; secondary=@("MEI","CF","RW"); overall=94; pace=90; shooting=89; passing=90; dribbling=96; defending=38; physical=70}
  "Kylian Mbappe" = @{pos="ST"; secondary=@("LW","RW"); overall=93; pace=97; shooting=91; passing=82; dribbling=92; defending=40; physical=80}
  "Angel Di Maria" = @{pos="RW"; secondary=@("MEI","RM","LW"); overall=90; pace=86; shooting=86; passing=91; dribbling=92; defending=55; physical=72}
  "Pablo Aimar" = @{pos="MEI"; secondary=@("CF","CM"); overall=91; pace=82; shooting=84; passing=91; dribbling=93; defending=42; physical=68}
  "Gaizka Mendieta" = @{pos="RM"; secondary=@("CM","MEI"); overall=90; pace=80; shooting=86; passing=90; dribbling=88; defending=68; physical=78}
}
$clubs = @()
$clubSeasons = @()
$players = @()

foreach ($season in $seasons) {
  $clubId = $season[1]
  if (-not ($clubs | Where-Object { $_.id -eq $clubId })) {
    $clubs += [ordered]@{ id=$clubId; name=$season[2]; shortName=$season[3]; country=$season[4]; primaryColor=$season[6]; secondaryColor=$season[7] }
  }
  $playerIds = @()
  for ($i = 0; $i -lt $positions.Count; $i++) {
    $pos = $positions[$i][0]
    $role = $positions[$i][1]
    $number = [int]$positions[$i][2]
    $overallBase = switch ($season[11]) { "lendaria" { 87 } "epica" { 84 } "rara" { 81 } default { 78 } }
    $overall = [Math]::Min(96, $overallBase + (($i * 3 + $clubId.Length) % 8))
    $id = "$($season[0])-p$($i+1)"
    $real = $realPlayers[$season[0]][$i]
    $playerName = $real[0]
    $shortName = $real[1]
    $nationality = $real[2]
    $profile = $playerProfiles[$playerName]
    if ($profile) {
      $pos = $profile.pos
      $overall = [int]$profile.overall
    }
    $canonical = ($playerName.ToLower() -replace "[^a-z0-9]+", "-").Trim("-")
    [string[]]$secondary = @(switch ($pos) {
      "GK" { @() }
      "RB" { @("RWB","RM") }
      "LB" { @("LWB","LM") }
      "CB" { @("DM") }
      "DM" { @("CM") }
      "CM" { @("DM","MEI") }
      "MEI" { @("CM","CF") }
      "RW" { @("RM","LW") }
      "LW" { @("LM","RW") }
      "ST" { @("CF") }
      "CF" { @("ST","MEI") }
      "RM" { @("RW","CM") }
      "LM" { @("LW","CM") }
      default { @() }
    })
    if ($profile) { [string[]]$secondary = @($profile.secondary) }
    $playerIds += $id
    $playerRecord = [ordered]@{
      id=$id; canonicalPlayerId=$canonical; name=$playerName; shortName=$shortName;
      nationality=$nationality; birthYear=1978 + (($i + $clubId.Length) % 22);
      preferredFoot=$(if ($i % 5 -eq 0) { "E" } elseif ($i % 7 -eq 0) { "Ambos" } else { "D" });
      primaryPosition=$pos; secondaryPositions=([string[]]$secondary); shirtNumber=$number; overall=$overall;
      pace=[Math]::Min(96, 64 + (($i*7 + $overall) % 31)); shooting=[Math]::Min(96, 55 + (($i*5 + $overall) % 36));
      passing=[Math]::Min(96, 58 + (($i*4 + $overall) % 34)); dribbling=[Math]::Min(96, 57 + (($i*6 + $overall) % 35));
      defending=[Math]::Min(96, $(if ($pos -in @("GK","CB","RB","LB","DM")) { 68 + (($i*3) % 24) } else { 38 + (($i*3) % 28) }));
      physical=[Math]::Min(96, 60 + (($i*8 + $overall) % 32));
      rarity=$season[11]; description="$playerName no elenco $($season[2]) $($season[5]). Rating editorial proprio do Craque ou Bagre.";
      clubSeasonId=$season[0]; isLegend=($season[11] -eq "lendaria" -and $overall -ge 90); isActive=$true; dataConfidence="demo";
      sources=@("Dataset demonstrativo substituivel")
    }
    if ($profile) {
      foreach ($stat in @("pace","shooting","passing","dribbling","defending","physical","goalkeeping")) {
        if ($profile.ContainsKey($stat)) { $playerRecord[$stat] = [int]$profile[$stat] }
      }
    }
    if ($pos -eq "GK") { $playerRecord.goalkeeping = [Math]::Min(96, $overall + 2) }
    $players += $playerRecord
  }
  $clubSeasons += [ordered]@{
    id=$season[0]; clubId=$season[1]; clubName=$season[2]; shortName=$season[3]; country=$season[4]; season=$season[5];
    primaryColor=$season[6]; secondaryColor=$season[7]; genericBadgeShape=$season[8]; badgeUrl="/club-badges/$($season[1]).png"; competitionStage=$season[9]; wasChampion=$season[10];
    rarity=$season[11]; description=$season[12]; players=$playerIds; isActive=$true; dataConfidence="demo"
  }
}

$opponents = @(
  @{id="benfica";name="Benfica";country="Portugal";strength=73;primaryColor="#e1251b";secondaryColor="#ffffff"},
  @{id="borussia-dortmund";name="Borussia Dortmund";country="Alemanha";strength=76;primaryColor="#fde100";secondaryColor="#111111"},
  @{id="internazionale";name="Internazionale";country="Italia";strength=78;primaryColor="#0057b8";secondaryColor="#111111"},
  @{id="arsenal";name="Arsenal";country="Inglaterra";strength=81;primaryColor="#ef0107";secondaryColor="#ffffff"},
  @{id="sevilla";name="Sevilla";country="Espanha";strength=84;primaryColor="#d71920";secondaryColor="#ffffff"},
  @{id="paris-saint-germain";name="Paris Saint-Germain";country="Franca";strength=87;primaryColor="#004170";secondaryColor="#da291c"},
  @{id="bayern-munique";name="Bayern de Munique";country="Alemanha";strength=90;primaryColor="#dc052d";secondaryColor="#0066b2"},
  @{id="real-madrid";name="Real Madrid";country="Espanha";strength=92;primaryColor="#ffffff";secondaryColor="#6d3cff"}
)

$achievements = @(
  @{id="primeiro-titulo";name="Primeiro titulo";description="Conquiste sua primeira campanha.";tier="gold"},
  @{id="campeao-invicto";name="Campeao invicto";description="Seja campeao sem perder.";tier="gold"},
  @{id="sete-vitorias";name="Sete vitorias";description="Venca todas as partidas.";tier="gold"},
  @{id="defesa-de-ferro";name="Defesa de ferro";description="Sofra no maximo dois gols.";tier="silver"},
  @{id="ataque-historico";name="Ataque historico";description="Marque 20 ou mais gols.";tier="silver"},
  @{id="zebra-europeia";name="Zebra europeia";description="Seja campeao com rating baixo.";tier="silver"},
  @{id="sem-lendas";name="Sem lendas";description="Seja campeao sem jogadores lendarios.";tier="bronze"},
  @{id="clube-fiel";name="Clube fiel";description="Seja campeao com cinco jogadores do mesmo clube.";tier="bronze"},
  @{id="torre-de-babel";name="Torre de Babel";description="Seja campeao com dez nacionalidades.";tier="bronze"},
  @{id="modo-lenda";name="Modo Lenda";description="Seja campeao na maior dificuldade.";tier="gold"},
  @{id="sem-mudancas";name="Sem mudancas";description="Seja campeao sem rerolls ou trocas.";tier="silver"},
  @{id="rei-dos-penaltis";name="Rei dos penaltis";description="Venca duas disputas na campanha.";tier="silver"},
  @{id="campanha-perfeita";name="Campanha Perfeita";description="Venca sete jogos, seja campeao e nao sofra gols.";tier="special"},
  @{id="final-dramatica";name="Final dramatica";description="Seja campeao marcando um gol decisivo na final depois dos 80 minutos.";tier="special"},
  @{id="artilheiro-lendario";name="Artilheiro lendario";description="Tenha um jogador do seu time com oito ou mais gols na campanha.";tier="special"},
  @{id="rolo-compressor";name="Rolo compressor";description="Seja campeao marcando 25 ou mais gols na campanha.";tier="special"}
)

$clubs | ConvertTo-Json -Depth 8 | Set-Content -Encoding UTF8 (Join-Path $dataDir "clubs.json")
$clubSeasons | ConvertTo-Json -Depth 12 | Set-Content -Encoding UTF8 (Join-Path $dataDir "club-seasons.json")
$players | ConvertTo-Json -Depth 12 | Set-Content -Encoding UTF8 (Join-Path $dataDir "players.json")
$opponents | ConvertTo-Json -Depth 8 | Set-Content -Encoding UTF8 (Join-Path $dataDir "opponents.json")
$achievements | ConvertTo-Json -Depth 8 | Set-Content -Encoding UTF8 (Join-Path $dataDir "achievements.json")


