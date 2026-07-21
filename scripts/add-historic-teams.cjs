const fs = require("fs");
const path = require("path");

const seasonsPath = path.join(process.cwd(), "src/data/club-seasons.json");
const playersPath = path.join(process.cwd(), "src/data/players.json");
const seasons = JSON.parse(fs.readFileSync(seasonsPath, "utf8"));
const players = JSON.parse(fs.readFileSync(playersPath, "utf8"));
const existing = new Set(seasons.map((season) => season.id));

const teams = [
  ["manchester-united-1998-99","manchester-united","Manchester United","MUN","Inglaterra","1998/99","#da291c","#fbe122","Campeao",1,"Peter Schmeichel/Dinamarca/GK/93/1;Gary Neville/Inglaterra/RB/87/2;Jaap Stam/Holanda/CB/92/6;Ronny Johnsen/Noruega/CB/85/5;Denis Irwin/Irlanda/LB/88/3;David Beckham/Inglaterra/RM/92/7/CM;Roy Keane/Irlanda/DM/93/16/CM;Paul Scholes/Inglaterra/CM/91/18/MEI;Ryan Giggs/Pais de Gales/LM/92/11/LW;Dwight Yorke/Trinidad e Tobago/ST/90/19;Andy Cole/Inglaterra/ST/88/9;Ole Gunnar Solskjaer/Noruega/ST/87/20;Teddy Sheringham/Inglaterra/CF/86/10;Nicky Butt/Inglaterra/DM/85/8;Phil Neville/Inglaterra/LB/83/12/RB"],
  ["real-madrid-2001-02","real-madrid","Real Madrid","RMA","Espanha","2001/02","#f5f5f5","#6d3cff","Campeao",1,"Iker Casillas/Espanha/GK/91/1;Michel Salgado/Espanha/RB/86/2;Fernando Hierro/Espanha/CB/89/4;Ivan Helguera/Espanha/CB/86/6/DM;Roberto Carlos/Brasil/LB/93/3/LWB;Luis Figo/Portugal/RW/94/10/RM;Claude Makelele/Franca/DM/91/24;Zinedine Zidane/Franca/MEI/97/5/CM;Santiago Solari/Argentina/LM/85/21;Raul/Espanha/CF/93/7/ST;Fernando Morientes/Espanha/ST/88/9;Guti/Espanha/CM/87/14/MEI;Steve McManaman/Inglaterra/RM/84/8;Flavio Conceicao/Brasil/DM/83/16;Cesar Sanchez/Espanha/GK/82/13"],
  ["real-madrid-2013-14","real-madrid","Real Madrid","RMA","Espanha","2013/14","#f5f5f5","#c9a227","Campeao",1,"Iker Casillas/Espanha/GK/89/1;Dani Carvajal/Espanha/RB/86/15;Sergio Ramos/Espanha/CB/92/4;Pepe/Portugal/CB/89/3;Marcelo/Brasil/LB/89/12;Angel Di Maria/Argentina/CM/90/22/RM,LM;Xabi Alonso/Espanha/DM/90/14;Luka Modric/Croacia/CM/91/19;Gareth Bale/Pais de Gales/RW/91/11;Karim Benzema/Franca/ST/90/9;Cristiano Ronaldo/Portugal/LW/98/7/ST;Isco/Espanha/MEI/87/23;Raphael Varane/Franca/CB/86/2;Fabio Coentrao/Portugal/LB/84/5;Diego Lopez/Espanha/GK/86/25"],
  ["barcelona-2014-15","barcelona","Barcelona","BAR","Espanha","2014/15","#004d98","#a50044","Campeao",1,"Marc-Andre ter Stegen/Alemanha/GK/88/1;Dani Alves/Brasil/RB/88/22;Gerard Pique/Espanha/CB/90/3;Javier Mascherano/Argentina/CB/87/14/DM;Jordi Alba/Espanha/LB/89/18;Sergio Busquets/Espanha/DM/92/5;Ivan Rakitic/Croacia/CM/88/4;Andres Iniesta/Espanha/CM/93/8/MEI;Lionel Messi/Argentina/RW/99/10/CF,ST;Luis Suarez/Uruguai/ST/94/9;Neymar/Brasil/LW/93/11;Xavi/Espanha/CM/90/6;Pedro/Espanha/RW/86/7/LW;Jeremy Mathieu/Franca/CB/83/24;Claudio Bravo/Chile/GK/87/13"],
  ["chelsea-2011-12","chelsea","Chelsea","CHE","Inglaterra","2011/12","#034694","#ffffff","Campeao",1,"Petr Cech/Republica Tcheca/GK/92/1;Branislav Ivanovic/Servia/RB/87/2/CB;Gary Cahill/Inglaterra/CB/85/24;John Terry/Inglaterra/CB/90/26;Ashley Cole/Inglaterra/LB/91/3;Ramires/Brasil/CM/87/7/RM;John Obi Mikel/Nigeria/DM/84/12;Frank Lampard/Inglaterra/CM/90/8;Juan Mata/Espanha/MEI/88/10/RM;Didier Drogba/Costa do Marfim/ST/91/11;Salomon Kalou/Costa do Marfim/LW/83/21;Fernando Torres/Espanha/ST/85/9;Michael Essien/Gana/DM/85/5;David Luiz/Brasil/CB/86/4;Florent Malouda/Franca/LM/84/15"],
  ["chelsea-2004-05","chelsea","Chelsea","CHE","Inglaterra","2004/05","#034694","#dba111","Semifinalista",0,"Petr Cech/Republica Tcheca/GK/93/1;Paulo Ferreira/Portugal/RB/85/20;Ricardo Carvalho/Portugal/CB/90/6;John Terry/Inglaterra/CB/91/26;William Gallas/Franca/LB/88/13/CB;Claude Makelele/Franca/DM/92/4;Frank Lampard/Inglaterra/CM/92/8;Tiago Mendes/Portugal/CM/85/30;Arjen Robben/Holanda/LW/90/16/RW;Didier Drogba/Costa do Marfim/ST/88/15;Damien Duff/Irlanda/LM/88/11;Eidur Gudjohnsen/Islandia/CF/86/22;Joe Cole/Inglaterra/MEI/86/10;Geremi/Camaroes/RM/83/14;Carlo Cudicini/Italia/GK/84/23"],
  ["liverpool-2004-05","liverpool","Liverpool","LIV","Inglaterra","2004/05","#c8102e","#00b2a9","Campeao",1,"Jerzy Dudek/Polonia/GK/87/1;Steve Finnan/Irlanda/RB/84/3;Jamie Carragher/Inglaterra/CB/89/23;Sami Hyypia/Finlandia/CB/88/4;John Arne Riise/Noruega/LB/86/6;Luis Garcia/Espanha/RM/86/10;Xabi Alonso/Espanha/CM/90/14;Steven Gerrard/Inglaterra/CM/94/8/MEI;Harry Kewell/Australia/LM/84/7;Milan Baros/Republica Tcheca/ST/85/5;Djibril Cisse/Franca/ST/84/9;Dietmar Hamann/Alemanha/DM/86/16;Vladimir Smicer/Republica Tcheca/MEI/83/11;Igor Biscan/Croacia/DM/81/25;Scott Carson/Inglaterra/GK/75/20"],
  ["arsenal-2003-04","arsenal","Arsenal","ARS","Inglaterra","2003/04","#ef0107","#f5f5f5","Invicto nacional",0,"Jens Lehmann/Alemanha/GK/88/1;Lauren/Camaroes/RB/85/12;Sol Campbell/Inglaterra/CB/90/23;Kolo Toure/Costa do Marfim/CB/87/28;Ashley Cole/Inglaterra/LB/89/3;Freddie Ljungberg/Suecia/RM/87/8;Patrick Vieira/Franca/CM/93/4/DM;Gilberto Silva/Brasil/DM/88/19;Robert Pires/Franca/LM/91/7;Dennis Bergkamp/Holanda/CF/91/10;Thierry Henry/Franca/ST/97/14/LW;Jose Antonio Reyes/Espanha/LW/84/9;Ray Parlour/Inglaterra/CM/83/15;Edu/Brasil/CM/84/17;Kanu/Nigeria/ST/83/25"],
  ["inter-1997-98","inter","Internazionale","INT","Italia","1997/98","#0057b8","#000000","Campeao europeu",0,"Gianluca Pagliuca/Italia/GK/90/1;Javier Zanetti/Argentina/RB/91/4/RM;Giuseppe Bergomi/Italia/CB/87/2;Taribo West/Nigeria/CB/84/6;Francesco Colonnese/Italia/LB/82/5;Diego Simeone/Argentina/CM/88/14/DM;Aron Winter/Holanda/CM/85/8;Benoit Cauet/Franca/DM/83/15;Youri Djorkaeff/Franca/MEI/89/10;Ivan Zamorano/Chile/ST/88/9;Ronaldo/Brasil/ST/98/10/CF;Alvaro Recoba/Uruguai/CF/86/20;Francesco Moriero/Italia/RM/84/7;Nwankwo Kanu/Nigeria/ST/82/25;Luigi Sartor/Italia/RB/81/3"],
  ["juventus-2002-03","juventus","Juventus","JUV","Italia","2002/03","#111111","#ffffff","Finalista",0,"Gianluigi Buffon/Italia/GK/96/1;Lilian Thuram/Franca/RB/91/21/CB;Ciro Ferrara/Italia/CB/87/2;Paolo Montero/Uruguai/CB/86/4;Gianluca Zambrotta/Italia/LB/89/19;Mauro Camoranesi/Italia/RM/87/16;Edgar Davids/Holanda/CM/90/26/DM;Alessio Tacchinardi/Italia/DM/85/3;Pavel Nedved/Republica Tcheca/LM/93/11/MEI;Alessandro Del Piero/Italia/CF/92/10;David Trezeguet/Franca/ST/91/17;Marcelo Zalayeta/Uruguai/ST/82/25;Antonio Conte/Italia/CM/84/8;Igor Tudor/Croacia/CB/83/5;Marco Di Vaio/Italia/ST/84/20"],
  ["milan-1988-89","milan","Milan","MIL","Italia","1988/89","#fb090b","#000000","Campeao",1,"Giovanni Galli/Italia/GK/88/1;Mauro Tassotti/Italia/RB/88/2;Franco Baresi/Italia/CB/96/6;Alessandro Costacurta/Italia/CB/90/5;Paolo Maldini/Italia/LB/93/3;Roberto Donadoni/Italia/RM/90/7;Carlo Ancelotti/Italia/CM/89/4;Frank Rijkaard/Holanda/DM/94/8/CB;Alberigo Evani/Italia/LM/86/11;Ruud Gullit/Holanda/CF/95/10/MEI;Marco van Basten/Holanda/ST/97/9;Pietro Paolo Virdis/Italia/ST/84/9;Angelo Colombo/Italia/CM/83/14;Filippo Galli/Italia/CB/84/15;Daniele Massaro/Italia/ST/83/18"],
  ["bayern-munique-2012-13","bayern","Bayern de Munique","BAY","Alemanha","2012/13","#dc052d","#0066b2","Campeao",1,"Manuel Neuer/Alemanha/GK/94/1;Philipp Lahm/Alemanha/RB/93/21;Dante/Brasil/CB/87/4;Jerome Boateng/Alemanha/CB/88/17;David Alaba/Austria/LB/90/27;Javi Martinez/Espanha/DM/89/8;Bastian Schweinsteiger/Alemanha/CM/92/31;Thomas Muller/Alemanha/MEI/90/25/RM,ST;Arjen Robben/Holanda/RW/91/10;Mario Mandzukic/Croacia/ST/88/9;Franck Ribery/Franca/LW/93/7;Toni Kroos/Alemanha/CM/88/39;Mario Gomez/Alemanha/ST/87/33;Luiz Gustavo/Brasil/DM/84/30;Daniel Van Buyten/Belgica/CB/83/5"],
  ["bayern-munique-2000-01","bayern","Bayern de Munique","BAY","Alemanha","2000/01","#dc052d","#ffffff","Campeao",1,"Oliver Kahn/Alemanha/GK/96/1;Willy Sagnol/Franca/RB/86/2;Patrik Andersson/Suecia/CB/87/5;Thomas Linke/Alemanha/CB/86/25;Bixente Lizarazu/Franca/LB/89/3;Hasan Salihamidzic/Bosnia/RM/86/20;Stefan Effenberg/Alemanha/CM/91/11;Owen Hargreaves/Inglaterra/DM/84/23;Mehmet Scholl/Alemanha/MEI/88/7;Giovane Elber/Brasil/ST/90/9;Carsten Jancker/Alemanha/ST/85/19;Paulo Sergio/Brasil/LW/84/13;Thorsten Fink/Alemanha/DM/83/17;Samuel Kuffour/Gana/CB/85/4;Alexander Zickler/Alemanha/ST/82/18"],
  ["borussia-dortmund-2012-13","borussia-dortmund","Borussia Dortmund","BVB","Alemanha","2012/13","#fde100","#000000","Finalista",0,"Roman Weidenfeller/Alemanha/GK/87/1;Lukasz Piszczek/Polonia/RB/87/26;Mats Hummels/Alemanha/CB/90/15;Neven Subotic/Servia/CB/86/4;Marcel Schmelzer/Alemanha/LB/84/29;Sven Bender/Alemanha/DM/85/6;Ilkay Gundogan/Alemanha/CM/89/8;Jakub Blaszczykowski/Polonia/RM/86/16;Mario Gotze/Alemanha/MEI/90/10;Marco Reus/Alemanha/LW/91/11;Robert Lewandowski/Polonia/ST/92/9;Kevin Grosskreutz/Alemanha/LM/83/19;Sebastian Kehl/Alemanha/DM/83/5;Felipe Santana/Brasil/CB/82/27;Julian Schieber/Alemanha/ST/80/23"],
  ["benfica-1961-62","benfica","Benfica","BEN","Portugal","1961/62","#e30613","#ffffff","Campeao",1,"Costa Pereira/Portugal/GK/89/1;Domiciano Cavem/Portugal/RB/86/2;Germano/Portugal/CB/88/4;Angelo Martins/Portugal/CB/84/5;Raul Machado/Portugal/LB/83/3;Jose Augusto/Portugal/RW/88/7;Mario Coluna/Portugal/CM/93/8;Fernando Cruz/Portugal/CM/85/6;Antonio Simoes/Portugal/LW/89/11;Jose Aguas/Portugal/ST/90/9;Eusebio/Portugal/ST/97/10;Jose Torres/Portugal/ST/86/12;Santana/Portugal/MEI/84/14;Serra/Portugal/DM/82/15;Neto/Portugal/CB/80/16"],
  ["santos-1962-63","santos","Santos","SAN","Brasil","1962/63","#ffffff","#111111","Campeao mundial",1,"Gilmar/Brasil/GK/92/1;Lima/Brasil/RB/87/2;Mauro Ramos/Brasil/CB/90/3;Dalmo/Brasil/CB/84/4;Calvet/Brasil/LB/83/6;Dorval/Brasil/RW/88/7;Zito/Brasil/DM/91/5;Mengalvio/Brasil/CM/87/8;Pepe/Brasil/LW/91/11;Coutinho/Brasil/ST/92/9;Pele/Brasil/CF/99/10/ST,MEI;Pagao/Brasil/ST/85/12;Tite/Brasil/CM/82/14;Haroldo/Brasil/CB/80/15;Laercio/Brasil/GK/78/16"],
  ["flamengo-1981-82","flamengo","Flamengo","FLA","Brasil","1981/82","#e30613","#111111","Campeao mundial",1,"Raul Plassmann/Brasil/GK/88/1;Leandro/Brasil/RB/92/2;Marinho/Brasil/CB/86/3;Mozer/Brasil/CB/87/4;Junior/Brasil/LB/93/6;Andrade/Brasil/DM/88/5;Adilio/Brasil/CM/90/8;Tita/Brasil/MEI/87/7;Lico/Brasil/RW/84/11;Nunes/Brasil/ST/89/9;Zico/Brasil/MEI/97/10/CF;Carpegiani/Brasil/CM/84/15;Peu/Brasil/LW/82/16;Anselmo/Brasil/ST/80/17;Cantarele/Brasil/GK/78/12"],
  ["sao-paulo-1992-93","sao-paulo","Sao Paulo","SPF","Brasil","1992/93","#ffffff","#e30613","Campeao mundial",1,"Zetti/Brasil/GK/88/1;Cafu/Brasil/RB/92/2;Adilson/Brasil/CB/85/3;Ronaldao/Brasil/CB/86/4;Leonardo/Brasil/LB/88/6;Dinho/Brasil/DM/85/5;Toninho Cerezo/Brasil/CM/90/8;Pintado/Brasil/CM/84/15;Rai/Brasil/MEI/94/10;Muller/Brasil/ST/89/7;Palhinha/Brasil/CF/88/9;Vitor/Brasil/RB/82/13;Elivelton/Brasil/LW/84/11;Macedo/Brasil/ST/82/19;Gilmar Rinaldi/Brasil/GK/80/12"],
  ["boca-juniors-2000-01","boca-juniors","Boca Juniors","BOC","Argentina","2000/01","#003391","#fbc02d","Campeao Libertadores",1,"Oscar Cordoba/Colombia/GK/89/1;Hugo Ibarra/Argentina/RB/87/4;Jorge Bermudez/Colombia/CB/88/2;Walter Samuel/Argentina/CB/90/6;Clemente Rodriguez/Argentina/LB/84/3;Mauricio Serna/Colombia/DM/87/5;Sebastian Battaglia/Argentina/CM/85/8;Jose Basualdo/Argentina/CM/84/14;Juan Roman Riquelme/Argentina/MEI/94/10;Martin Palermo/Argentina/ST/91/9;Guillermo Barros Schelotto/Argentina/CF/88/7;Marcelo Delgado/Argentina/ST/85/16;Nicolas Burdisso/Argentina/CB/82/13;Cristian Traverso/Argentina/DM/82/11;Roberto Abbondanzieri/Argentina/GK/84/12"],
  ["corinthians-2012","corinthians","Corinthians","COR","Brasil","2012/13","#ffffff","#111111","Campeao mundial",1,"Cassio/Brasil/GK/91/12;Alessandro/Brasil/RB/84/2;Chicao/Brasil/CB/85/3;Paulo Andre/Brasil/CB/84/13;Fabio Santos/Brasil/LB/84/6;Ralf/Brasil/DM/88/5;Paulinho/Brasil/CM/90/8;Danilo/Brasil/MEI/86/20;Jorge Henrique/Brasil/RW/84/23;Emerson Sheik/Brasil/LW/87/11;Paolo Guerrero/Peru/ST/88/9;Romarinho/Brasil/CF/83/31;Douglas/Brasil/MEI/84/10;Edenilson/Brasil/RB/82/21;Liedson/Portugal/ST/82/19"],
  ["atletico-madrid-2013-14","atletico-madrid","Atletico de Madrid","ATM","Espanha","2013/14","#c8102e","#0a3d91","Finalista",0,"Thibaut Courtois/Belgica/GK/91/13;Juanfran/Espanha/RB/86/20;Diego Godin/Uruguai/CB/91/2;Miranda/Brasil/CB/88/23;Filipe Luis/Brasil/LB/88/3;Gabi/Espanha/CM/87/14/DM;Tiago/Portugal/CM/85/5;Koke/Espanha/RM/88/6/CM;Arda Turan/Turquia/LM/88/10;David Villa/Espanha/CF/87/9;Diego Costa/Espanha/ST/91/19;Raul Garcia/Espanha/MEI/84/8;Adrian Lopez/Espanha/ST/82/7;Mario Suarez/Espanha/DM/83/4;Jose Sosa/Argentina/MEI/82/24"],
  ["manchester-city-2018-19","manchester-city","Manchester City","MCI","Inglaterra","2018/19","#6cabdd","#1c2c5b","Campeao nacional",0,"Ederson/Brasil/GK/90/31;Kyle Walker/Inglaterra/RB/87/2;Vincent Kompany/Belgica/CB/88/4;Aymeric Laporte/Franca/CB/89/14;Oleksandr Zinchenko/Ucrania/LB/84/35;Fernandinho/Brasil/DM/89/25;Kevin De Bruyne/Belgica/CM/94/17;David Silva/Espanha/MEI/91/21;Bernardo Silva/Portugal/RW/90/20/CM;Sergio Aguero/Argentina/ST/93/10;Raheem Sterling/Inglaterra/LW/90/7;Riyad Mahrez/Argelia/RW/87/26;Ilkay Gundogan/Alemanha/CM/87/8;Gabriel Jesus/Brasil/ST/85/33;Leroy Sane/Alemanha/LW/88/19"],
  ["napoli-1986-87","napoli","Napoli","NAP","Italia","1986/87","#12a0d7","#ffffff","Campeao nacional",0,"Claudio Garella/Italia/GK/84/1;Giuseppe Bruscolotti/Italia/RB/85/2;Ciro Ferrara/Italia/CB/88/5;Alessandro Renica/Italia/CB/84/6;Moreno Ferrario/Italia/LB/82/3;Fernando De Napoli/Italia/CM/86/4;Salvatore Bagni/Italia/DM/87/8;Francesco Romano/Italia/CM/83/7;Diego Maradona/Argentina/MEI/99/10/CF;Andrea Carnevale/Italia/ST/84/9;Bruno Giordano/Italia/ST/88/11;Careca/Brasil/ST/90/7;Ciro Muro/Italia/MEI/80/14;Luigi Caffarelli/Italia/LW/79/15;Raffaele Di Fusco/Italia/GK/76/12"],
  ["lazio-1999-00","lazio","Lazio","LAZ","Italia","1999/00","#87d8f7","#ffffff","Campeao nacional",0,"Luca Marchegiani/Italia/GK/87/1;Giuseppe Pancaro/Italia/RB/84/2;Alessandro Nesta/Italia/CB/95/13;Sinisa Mihajlovic/Servia/CB/88/11;Paolo Negro/Italia/LB/84/3;Diego Simeone/Argentina/DM/88/14;Juan Sebastian Veron/Argentina/CM/92/23;Pavel Nedved/Republica Tcheca/LM/91/18;Roberto Mancini/Italia/CF/88/10;Marcelo Salas/Chile/ST/89/9;Hernan Crespo/Argentina/ST/91/20;Sergio Conceicao/Portugal/RM/86/7;Dejan Stankovic/Servia/CM/85/8;Simone Inzaghi/Italia/ST/84/21;Angelo Peruzzi/Italia/GK/88/1"],
  ["roma-2000-01","roma","Roma","ROM","Italia","2000/01","#8e1f2f","#f0bc42","Campeao nacional",0,"Francesco Antonioli/Italia/GK/84/1;Cafu/Brasil/RB/92/2;Walter Samuel/Argentina/CB/90/19;Aldair/Brasil/CB/87/6;Vincent Candela/Franca/LB/87/32;Damiano Tommasi/Italia/DM/85/17;Emerson/Brasil/CM/88/11;Cristiano Zanetti/Italia/CM/84/8;Francesco Totti/Italia/MEI/95/10/CF;Gabriel Batistuta/Argentina/ST/93/18;Vincenzo Montella/Italia/ST/90/9;Marco Delvecchio/Italia/LW/84/24;Hidetoshi Nakata/Japao/MEI/86/8;Jonathan Zebina/Franca/CB/82/15;Ivan Pelizzoli/Italia/GK/78/22"],
  ["galatasaray-1999-00","galatasaray","Galatasaray","GAL","Turquia","1999/00","#a90432","#fdb912","Campeao europeu",1,"Claudio Taffarel/Brasil/GK/89/1;Capone/Brasil/RB/83/2;Bulent Korkmaz/Turquia/CB/87/3;Gheorghe Popescu/Romenia/CB/88/5;Hakan Unsal/Turquia/LB/84/6;Okan Buruk/Turquia/RM/85/7;Suat Kaya/Turquia/DM/84/8;Emre Belozoglu/Turquia/CM/86/21;Gheorghe Hagi/Romenia/MEI/94/10;Arif Erdem/Turquia/ST/85/9;Hakan Sukur/Turquia/ST/90/11;Hasan Sas/Turquia/LM/83/12;Umit Davala/Turquia/RB/84/22;Mario Jardel/Brasil/ST/88/16;Kerem Inan/Turquia/GK/74/13"],
  ["parma-1998-99","parma","Parma","PAR","Italia","1998/99","#f6d04d","#1e50a2","Campeao europeu",1,"Gianluigi Buffon/Italia/GK/92/1;Lilian Thuram/Franca/RB/92/21/CB;Fabio Cannavaro/Italia/CB/91/17;Roberto Sensini/Argentina/CB/86/6;Antonio Benarrivo/Italia/LB/86/3;Diego Fuser/Italia/RM/86/7;Dino Baggio/Italia/CM/87/8;Juan Sebastian Veron/Argentina/CM/91/14;Paolo Vanoli/Italia/LM/82/13;Enrico Chiesa/Italia/ST/89/20;Hernan Crespo/Argentina/ST/91/9;Ariel Ortega/Argentina/MEI/86/10;Faustino Asprilla/Colombia/CF/85/11;Alain Boghossian/Franca/DM/83/5;Luigi Sartor/Italia/RB/82/2"],
  ["river-plate-1996","river-plate","River Plate","RIV","Argentina","1996/97","#ffffff","#d71920","Campeao Libertadores",1,"German Burgos/Argentina/GK/87/1;Hernan Diaz/Argentina/RB/84/4;Roberto Ayala/Argentina/CB/89/2;Celso Ayala/Paraguai/CB/85/6;Juan Pablo Sorin/Argentina/LB/87/3;Matias Almeyda/Argentina/DM/88/5;Marcelo Gallardo/Argentina/MEI/89/10/CM;Leonardo Astrada/Argentina/CM/85/8;Ariel Ortega/Argentina/CF/91/7/RW;Enzo Francescoli/Uruguai/CF/92/9;Hernan Crespo/Argentina/ST/90/11;Santiago Solari/Argentina/LM/84/14;Marcelo Salas/Chile/ST/86/18;Jorge Borrelli/Argentina/CM/81/15;Sergio Berti/Argentina/LM/83/16"],
  ["palmeiras-1999","palmeiras","Palmeiras","PAL","Brasil","1999/00","#006437","#ffffff","Campeao Libertadores",1,"Marcos/Brasil/GK/91/12;Arce/Paraguai/RB/88/2;Roque Junior/Brasil/CB/87/3;Junior Baiano/Brasil/CB/86/4;Junior/Brasil/LB/88/6;Cesar Sampaio/Brasil/DM/89/5;Rogerio/Brasil/CM/84/8;Alex/Brasil/MEI/91/10;Zinho/Brasil/LM/87/11;Paulo Nunes/Brasil/ST/88/7;Evair/Brasil/ST/89/9;Oseas/Brasil/ST/84/19;Euller/Brasil/LW/84/16;Galeano/Brasil/DM/83/15;Velloso/Brasil/GK/82/1"],
  ["cruzeiro-1997","cruzeiro","Cruzeiro","CRU","Brasil","1997/98","#0033a0","#ffffff","Campeao Libertadores",1,"Dida/Brasil/GK/91/1;Vitor/Brasil/RB/84/2;Cris/Brasil/CB/86/3;Gelson Baresi/Brasil/CB/82/4;Nonato/Brasil/LB/83/6;Fabinho/Brasil/DM/84/5;Ricardinho/Brasil/CM/87/8;Palhinha/Brasil/MEI/89/10;Elivelton/Brasil/LW/85/11;Marcelo Ramos/Brasil/ST/88/9;Bebeto/Brasil/ST/90/7;Cleison/Brasil/MEI/82/15;Donizete/Brasil/ST/84/19;Valdo/Brasil/CM/83/18;Andre/Brasil/GK/76/12"],
  ["ajax-1971-72","ajax","Ajax","AJA","Holanda","1971/72","#d2122e","#ffffff","Campeao",1,"Heinz Stuy/Holanda/GK/86/1;Wim Suurbier/Holanda/RB/88/2;Velibor Vasovic/Iugoslavia/CB/87/4;Barry Hulshoff/Holanda/CB/88/3;Ruud Krol/Holanda/LB/91/5;Johan Neeskens/Holanda/CM/92/13;Arie Haan/Holanda/CM/89/6;Gerrie Muhren/Holanda/CM/87/8;Sjaak Swart/Holanda/RW/88/7;Johan Cruyff/Holanda/CF/98/14/ST,MEI;Piet Keizer/Holanda/LW/91/11;Dick van Dijk/Holanda/ST/85/9;Johnny Rep/Holanda/RW/84/10;Horst Blankenburg/Alemanha/CB/84/12;Arnold Muhren/Holanda/CM/83/15"],
  ["milan-2002-03","milan","Milan","MIL","Italia","2002/03","#fb090b","#000000","Campeao",1,"Dida/Brasil/GK/90/12;Cafu/Brasil/RB/88/2;Alessandro Nesta/Italia/CB/94/13;Paolo Maldini/Italia/CB/95/3/LB;Kaladze/Georgia/LB/86/4;Gennaro Gattuso/Italia/DM/90/8;Andrea Pirlo/Italia/CM/93/21;Clarence Seedorf/Holanda/CM/90/20;Rui Costa/Portugal/MEI/91/10;Filippo Inzaghi/Italia/ST/90/9;Andriy Shevchenko/Ucrania/ST/94/7;Serginho/Brasil/LM/86/27;Massimo Ambrosini/Italia/DM/85/23;Alessandro Costacurta/Italia/CB/84/5;Jon Dahl Tomasson/Dinamarca/ST/84/15"],
  ["real-madrid-1997-98","real-madrid","Real Madrid","RMA","Espanha","1997/98","#f5f5f5","#6d3cff","Campeao",1,"Bodo Illgner/Alemanha/GK/87/1;Christian Panucci/Italia/RB/86/2;Fernando Hierro/Espanha/CB/91/4;Manolo Sanchis/Espanha/CB/86/5;Roberto Carlos/Brasil/LB/93/3;Clarence Seedorf/Holanda/CM/89/10;Fernando Redondo/Argentina/DM/92/6;Christian Karembeu/Franca/CM/86/8;Raul/Espanha/CF/92/7;Predrag Mijatovic/Iugoslavia/ST/90/9;Davor Suker/Croacia/ST/89/11;Guti/Espanha/MEI/84/14;Fernando Morientes/Espanha/ST/85/15;Aitor Karanka/Espanha/CB/82/12;Santiago Canizares/Espanha/GK/85/13"],
  ["barcelona-1993-94","barcelona","Barcelona","BAR","Espanha","1993/94","#004d98","#a50044","Finalista",0,"Andoni Zubizarreta/Espanha/GK/88/1;Albert Ferrer/Espanha/RB/86/2;Ronald Koeman/Holanda/CB/92/4;Miguel Angel Nadal/Espanha/CB/86/5;Sergi Barjuan/Espanha/LB/84/3;Pep Guardiola/Espanha/DM/90/6;Jose Mari Bakero/Espanha/CM/87/8;Michael Laudrup/Dinamarca/MEI/93/10;Hristo Stoichkov/Bulgaria/LW/94/8;Romario/Brasil/ST/96/10;Txiki Begiristain/Espanha/RW/86/11;Guillermo Amor/Espanha/CM/85/7;Eusebio Sacristan/Espanha/CM/83/14;Julio Salinas/Espanha/ST/84/9;Carles Busquets/Espanha/GK/78/12"],
  ["ajax-2018-19","ajax","Ajax","AJA","Holanda","2018/19","#d2122e","#ffffff","Semifinalista",0,"Andre Onana/Camaroes/GK/86/24;Noussair Mazraoui/Marrocos/RB/83/12;Matthijs de Ligt/Holanda/CB/90/4;Daley Blind/Holanda/CB/86/17/LB;Nicolas Tagliafico/Argentina/LB/85/31;Frenkie de Jong/Holanda/CM/91/21;Lasse Schone/Dinamarca/DM/84/20;Donny van de Beek/Holanda/MEI/86/6;Hakim Ziyech/Marrocos/RW/88/22;Dusan Tadic/Servia/CF/88/10;David Neres/Brasil/LW/84/7;Kasper Dolberg/Dinamarca/ST/82/25;Joel Veltman/Holanda/CB/82/3;Quincy Promes/Holanda/LW/83/11;Klaas-Jan Huntelaar/Holanda/ST/82/9"]
];

const slug = (value) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const rarity = (overall) => (overall >= 93 ? "lendaria" : overall >= 89 ? "epica" : overall >= 84 ? "rara" : "comum");
const stats = (position, overall) => {
  if (position === "GK") return { pace: Math.max(55, overall - 5), shooting: 45, passing: Math.max(60, overall - 8), dribbling: Math.max(55, overall - 12), defending: Math.max(60, overall - 7), physical: Math.max(70, overall - 4), goalkeeping: overall };
  const isDef = ["CB", "LB", "RB", "LWB", "RWB", "DM"].includes(position);
  const isMid = ["CM", "MEI", "RM", "LM"].includes(position);
  const isFast = ["RW", "LW", "RB", "LB", "RWB", "LWB"].includes(position);
  return {
    pace: Math.min(99, Math.max(64, overall + (isFast ? 3 : 0))),
    shooting: Math.min(99, Math.max(55, overall + (["ST", "CF", "RW", "LW"].includes(position) ? 2 : isMid ? -2 : -15))),
    passing: Math.min(99, Math.max(58, overall + (isMid || position === "MEI" ? 3 : isDef ? -5 : -1))),
    dribbling: Math.min(99, Math.max(58, overall + (["RW", "LW", "MEI", "CF"].includes(position) ? 4 : isMid ? 1 : -6))),
    defending: Math.min(99, Math.max(45, overall + (isDef ? 3 : isMid ? -4 : -18))),
    physical: Math.min(99, Math.max(60, overall + (["CB", "DM", "ST"].includes(position) ? 2 : -2)))
  };
};

let addedSeasons = 0;
let addedPlayers = 0;

for (const [id, clubId, clubName, shortName, country, season, primaryColor, secondaryColor, stage, wasChampion, roster] of teams) {
  if (existing.has(id)) continue;
  const rows = roster.split(";").map((entry) => {
    const [name, nationality, primaryPosition, overall, shirtNumber, secondary = ""] = entry.split("/");
    return { name, nationality, primaryPosition, overall: Number(overall), shirtNumber: Number(shirtNumber), secondaryPositions: secondary ? secondary.split(",") : [] };
  });
  const seasonPlayerIds = rows.map((_, index) => `${id}-p${index + 1}`);
  seasons.push({
    id,
    clubId,
    clubName,
    shortName,
    country,
    season,
    primaryColor,
    secondaryColor,
    genericBadgeShape: "crest",
    competitionStage: stage,
    wasChampion: Boolean(wasChampion),
    rarity: wasChampion ? "lendaria" : "epica",
    description: `${clubName} ${season}: elenco historico com jogadores conhecidos no futebol mundial.`,
    players: seasonPlayerIds,
    isActive: true,
    dataConfidence: "demo"
  });
  rows.forEach((row, index) => {
    players.push({
      id: `${id}-p${index + 1}`,
      canonicalPlayerId: slug(row.name),
      name: row.name,
      shortName: row.name.split(" ").slice(-1)[0],
      nationality: row.nationality,
      birthYear: 1988,
      preferredFoot: "D",
      primaryPosition: row.primaryPosition,
      secondaryPositions: row.secondaryPositions,
      shirtNumber: row.shirtNumber,
      overall: row.overall,
      ...stats(row.primaryPosition, row.overall),
      rarity: rarity(row.overall),
      description: `${row.name} no elenco ${clubName} ${season}. Rating editorial proprio do Craque ou Bagre.`,
      clubSeasonId: id,
      isLegend: row.overall >= 90,
      isActive: true,
      dataConfidence: "demo",
      sources: ["Rating editorial estimado para balanceamento do jogo"]
    });
  });
  addedSeasons += 1;
  addedPlayers += rows.length;
}

fs.writeFileSync(seasonsPath, `${JSON.stringify(seasons, null, 2)}\n`);
fs.writeFileSync(playersPath, `${JSON.stringify(players, null, 2)}\n`);
console.log(`Adicionados ${addedSeasons} elencos e ${addedPlayers} jogadores.`);
