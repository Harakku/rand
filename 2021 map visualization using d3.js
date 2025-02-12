/**
 * @version 14/12/2021
 * (c) O. Mehtonen
 * (c) J. Kanninen
 * (c) J. Lintunen
 * (c) J. Heikkilä
 */

var KENTAT = ["Medals (Total)"];
var VALITTU_KENTTA = 0; // Tän kun vaihtaa 0 niin kartta piirtyy väkiluvun mukaan
var NOUSEVA = false; // Toplistan suunta: True => Pienin -> Suurin
var LIGHT = true;   // true -> valomoodi päällä, false -> pimeämoodi päällä
var BOLDATTU_MAA;

const APUKENTAT = {
  "Medals": ["Medals (Total)", "Gold", "Silver", "Bronze", "Medals (Per capita)", "Medals (Summer)", "Medals (Winter)"],
  "Times Hosted": ["Hosts (Total)", "Hosts (Summer)", "Hosts (Winter)"],
  "Appearances": ["Appearances (Total)", "Appearances (Summer)", "Appearances (Winter)"],
  "Medals by Sport": [
    "Aeronautics", "Alpine Skiing", "Alpinism", "Archery", "Art Competitions", "Athletics", "Badminton",
    "Baseball", "Basketball", "Basque Pelota", "Beach Volleyball", "Biathlon", "Bobsleigh", "Boxing", "Canoeing",
    "Cricket", "Croquet", "Cross Country Skiing", "Curling", "Cycling", "Diving", "Equestrianism", "Fencing",
    "Figure Skating", "Football", "Freestyle Skiing", "Golf", "Gymnastics", "Handball", "Hockey", "Ice Hockey",
    "Jeu De Paume", "Judo", "Lacrosse", "Luge", "Military Ski Patrol", "Modern Pentathlon", "Motorboating",
    "Nordic Combined", "Polo", "Racquets", "Rhythmic Gymnastics", "Roque", "Rowing", "Rugby", "Rugby Sevens",
    "Sailing", "Shooting", "Short Track Speed Skating", "Skeleton", "Ski Jumping", "Snowboarding", "Softball",
    "Speed Skating", "Swimming", "Synchronized Swimming", "Table Tennis", "Taekwondo", "Tennis", "Trampolining",
    "Triathlon", "Tug-Of-War", "Volleyball", "Water Polo", "Weightlifting", "Wrestling"
  ]
};

d3.select("#dark-light")
  .on("click", lightModeHandler);

/**
 * Vaihtaa valo- ja pimeämoodien välillä
 */
function lightModeHandler() {
  LIGHT = !LIGHT;
  document.getElementById('dark-light').innerHTML = (LIGHT ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>');
  document.body.classList.toggle("dark-mode");
}

let mql = window.matchMedia('(prefers-color-scheme: dark');

/**
 * Jos käyttäjällä pimeämoodi päällä, laittaa sivulle pimeämoodin päälle.
 */
if (mql.matches) {
  lightModeHandler();
}

function modeChangeHandler(e) {
  if (e.matches) {
    if (LIGHT) {
      lightModeHandler();
    }
  }
  else {
    if (!LIGHT) {
      lightModeHandler();
    }
  }
}

/**
 * Jos käyttäjä muuttaa moodiasetuksiaan, sivu muuttuu vastaamaan niitä
 */
mql.addEventListener("change", modeChangeHandler);

//About-ikkunan JS-koodi, lainattu w3schoolsilta
let modal = document.getElementById("modaali");
let btn = document.getElementById("about");
let span = document.getElementsByClassName("close")[0];
btn.onclick = function() { //Tuo About-ikkunan esille
  modal.style.display = "block";
}
span.onclick = function() { //Piilottaa About-ikkunan ruksia painamalla
  modal.style.display = "none";
}
window.onclick = function(event) { //Piilottaa About-ikkunan ikkunan ulkopuolelta painamalla
  if (event.target == modal) {
    modal.style.display = "none";
  }
}

// Create a tooltip
var tooltip = d3.select("#tooltip")
  .attr("class", "tooltip")
  .style("background-color", "white")
  .style("color", "black")
  .style("border", "solid")
  .style("border-width", "1px")
  .style("border-radius", "5px")
  .style("padding", "5px")
  .style("position", "absolute");

var projection = d3.geoMercator();

let promises = [];
promises.push(d3.json("Data/world.geojson"));
promises.push(d3.json("Data/tietorakenne.json"));
promises.push(fetch("Data/heatmap.json").then(response => response.json()));

/**
 * Ladattua dataa käyttävät asiat tänne
 */
Promise.all(promises).then(function(promisedData) {
  // Tietorakenteen avaimina ovat valtioiden ISO 3166-1 alpha-3 -koodit.
  // Koodittomat tietueet on merkitty ISO 3166-1 alpha-3 -standardin vapaasti käytettävillä koodeilla seuraavasti:
  // XSL: Somaliland, XNC: Northern Cyprus, XKO: Kosovo, XBO: Bohemia, XBI: British West Indies,
  // XRC: Republic of China, XCS: Czechoslovakia, XEG: East Germany, XUG: United Team of Germany, XWG: West Germany,
  // XIP: Independent Olympic Participants, XKR: Korea, XML: Malaya, XMI: Marshall Islands, XNB: North Borneo
  // XRE: Russian Empire, XSA: Saar, XSM: Serbia and Montenegro, XSU: Soviet Union, XUT: Unified Team
  // XNY: North Yemen, XSY: South Yemen, XYS: Yugoslavia
  let my_topo = promisedData[0];
  let TIETORAKENNE = promisedData[1];
  let HEATMAP = promisedData[2];

  // Labelien lisääminen HEATMAPpiin
  for (let lajinNimi in HEATMAP) {
    let laji = HEATMAP[lajinNimi];
    laji.labels = ["0"];
    for (let i = 0; i < laji.domain.length; i++) {
      if (i === laji.domain.length - 1) {
        laji.labels.push(">" + laji.domain[i]);
      } else {
        laji.labels.push(laji.domain[i] + " - " + laji.domain[i+1]);
      }
    }
  }

  yhdistaGeo(my_topo, "GRL", "DNK"); 
  /**
   * Valtion toiseen liittämisen yleistys
   * Ei pitäisi toimia, mutta toimii Grönlannin liittämiseen osaksi Tanskaa.
   */
  function yhdistaGeo(worldGeo, liitettava, liittaja) {
    let liitettavaCoords, liittajaCoords;
    for (let i=0;i<worldGeo.features.length;i++) {
      let id = worldGeo.features[i].id;
      switch (id) {
        case liitettava:
          liitettavaCoords = worldGeo.features[i].geometry.coordinates;
          worldGeo.features.splice(i,1);
          i--;
          break;
        case liittaja:
          liittajaCoords = worldGeo.features[i].geometry.coordinates;
          break;
        default:
          break;
      }
    }
    if (liitettavaCoords&&liittajaCoords) {
      liittajaCoords.push(liitettavaCoords);
    }
  }

  // Luodaan selectboxei
  var cat1 = document.getElementById("category1"),  // Ylempi selectbox
    cat2 = document.getElementById("category2");  // Alempi selectbox
  for (var x in APUKENTAT) {
    cat1.options.add(new Option(x, x));
  }
  // Mitä käy kun ylempi selectbox vaihdetaan
  cat1.onchange = function() {
    // Tyhjennetään alempi dropdown
    cat2.length = 1;
    // Pistetään siihen oikeat arvot
    if (cat1.value != "") {
      var z = APUKENTAT[cat1.value];
      for (var i = 0; i < z.length; i++) {
        cat2.options.add(new Option(z[i], i));
      }
    }
  };
  // Mitä käy kun alempi selectbox vaihdetaan
  cat2.onchange = function() {
    if (cat2.value != "") {
      KENTAT = APUKENTAT[cat1.value];
      VALITTU_KENTTA = cat2.value;
      piirra(my_topo);
    }
  };

  d3.select("#topnappi")
    .on("click", suuntaHandler)
    .style("float", "left");

  // Toplistan suunnanvaihtonapin tapahtumankäsittelijä
  function suuntaHandler() {
    NOUSEVA = !NOUSEVA;
    document.getElementById('topnappi').innerHTML = (NOUSEVA ? '<i class="fas fa-angle-down"></i>' : '<i class="fas fa-angle-up"></i>');
    let lista = document.getElementById("toplista");
    lista.reversed = !lista.reversed;
    luoTopLista();
  }

  function luoTopLista() {
    /**
     * Sivun oikean reunan toplistan sisältö
     */
    function topLista() {
      let valtiot = Object.values(TIETORAKENNE).slice(); // Kopio VALTIOLISTAsta, ettei lajittelu muuta alkuperäistä
      let lajittelu = KENTAT[VALITTU_KENTTA];
      valtiot.sort(function (a,b) {
        return (NOUSEVA) ? (a[lajittelu]-b[lajittelu]):(b[lajittelu]-a[lajittelu]);
      });
      return valtiot.slice(0,valtiot.length);
    }

    // Asettaa toplistan otsikon annetun kentän mukaan
    d3.select("#topotsikko")
      .text("Top List - " + KENTAT[VALITTU_KENTTA]);

    d3.select("#toplista").selectAll("*").remove();

    // Luo toplistan sivun oikeaan reunaan
    d3.select("#toplista").selectAll("li")
      .data(topLista())
      .join("li")
      .attr("id", function(d) {
        return "top_" + d.id;
      })
      .text(
        function(d) {
          return d.Nation + (d.Exists == "YES" ? "" : "  ✝");
        })
      .append("span")
      .style("float", "right")
      .text(
        function(d) {
          return `${Math.round(d[KENTAT[VALITTU_KENTTA]] * 100) / 100}`;
        }
      );
      d3.select("#toplista")
      .selectAll("li")
      .attr("class", "");

      d3.select("#top_"+BOLDATTU_MAA)
        .classed("boldattu", true);
  }

  piirra(my_topo);
  /**
   * Kartanpiirtämiset sun muut
   */
  function piirra(topo) {
    d3.select("svg")
      .remove();
    d3.select("#map")
      .append("svg");
    let svg = d3.select("svg")
      .attr("viewBox", "0 -200 960 750");

    var colorScale = d3.scaleThreshold()
      .domain(HEATMAP[KENTAT[VALITTU_KENTTA]].domain)
      .range(HEATMAP[KENTAT[VALITTU_KENTTA]].range);

    let mouseOver = function(d) {
      if (!TIETORAKENNE[d.id]) {return;} // Valtio on kartalla mutta sitä ei löydy tietorakenteesta

      let valtio = TIETORAKENNE[d.id];
      if (valtio) {
        tooltip
          .style("opacity", 1)
          .html(valtio.Nation + ": " + d3.format(",")(Math.round(valtio[KENTAT[VALITTU_KENTTA]] * 100) / 100))
          .style("left", (d3.event.pageX) + "px")
          .style("top", (d3.event.pageY - 28) + "px");
      }
      d3.select("#top_" + valtio.id)
        .classed("hover_boldattu", true);
    };

    let mouseLeave = function(d) {
      if (!TIETORAKENNE[d.id]) {return;} // Valtio on kartalla mutta sitä ei löydy tietorakenteesta

      let valtio = TIETORAKENNE[d.id];
      d3.select("#top_" + valtio.id)
        .classed("hover_boldattu", false);
      tooltip
        .style("opacity", 0);
    };

    // Mitä käy kun jotain valtiota klikataan, tulostaa infot ja vaihtaa klikatun valtion värin
    let click = function(d) {
      let valtio = TIETORAKENNE[d.id];

      // Tulostetaan infot vasempaan reunaan
      // Tää on kunnon tulostus helvetti mut ihsm toimii ja meni joku 5min :^D 
      if (valtio) {
        document.getElementById("infootsikko").textContent = "";
        document.getElementById("nimi").textContent = valtio.Nation;
        document.getElementById("nimi").style.color = "#FF4C29";
        document.getElementById("nimi").href = `https://en.wikipedia.org/wiki/${valtio.Nation}_at_the_Olympics`;
        let h2 = document.querySelectorAll("h2");
        for (i = 0; i < h2.length; i++) {
          h2[i].style.visibility = "visible";
        }
        
        valtio.Flag != null ? (document.getElementById("lippu").src=valtio.Flag) : (document.getElementById("lippu").src="");

        document.getElementById("Mitalit").textContent = "Total: " + valtio["Medals (Total)"];
        document.getElementById("Kulta").innerHTML = "<i class='fas fa-medal' style='color:gold'></i> " + valtio.Gold;
        document.getElementById("Hopea").innerHTML = "<i class='fas fa-medal' style='color:silver'></i> " + valtio.Silver;
        document.getElementById("Pronssi").innerHTML = "<i class='fas fa-medal' style='color:#CD7F32'></i> " + valtio.Bronze;
        document.getElementById("MitalitPC").innerHTML = "Total (per capita): " + Math.round(valtio["Medals (Per capita)"]*100)/100;

        document.getElementById("KesaMitalit").textContent = "Total: " + valtio["Medals (Summer)"];
        document.getElementById("KultaK").innerHTML = "<i class='fas fa-medal' style='color:gold'></i> " + valtio.SO_Gold;
        document.getElementById("HopeaK").innerHTML = "<i class='fas fa-medal' style='color:silver'></i> " + valtio.SO_Silver;
        document.getElementById("PronssiK").innerHTML = "<i class='fas fa-medal' style='color:#CD7F32'></i> " + valtio.SO_Bronze;

        document.getElementById("TalviMitalit").textContent = "Total: " + valtio["Medals (Winter)"];
        document.getElementById("KultaT").innerHTML = "<i class='fas fa-medal' style='color:gold'></i> " + valtio.WO_Gold;
        document.getElementById("HopeaT").innerHTML = "<i class='fas fa-medal' style='color:silver'></i> " + valtio.WO_Silver;
        document.getElementById("PronssiT").innerHTML = "<i class='fas fa-medal' style='color:#CD7F32'></i> " + valtio.WO_Bronze;

        document.getElementById("ParasLaji").textContent = valtio.MostSuccessfulSport;
        document.getElementById("KultaP").innerHTML = "<i class='fas fa-medal' style='color:gold'></i> " + valtio.Golds;
        document.getElementById("HopeaP").innerHTML = "<i class='fas fa-medal' style='color:silver'></i> " + valtio.Silvers;
        document.getElementById("PronssiP").innerHTML = "<i class='fas fa-medal' style='color:#CD7F32'></i> " + valtio.Bronzes;

        // Värjätään top-listasta valittu valtio 
        BOLDATTU_MAA = valtio.id;
        d3.select("#toplista")
          .selectAll("li")
          .attr("class", "");

        d3.select("#top_"+BOLDATTU_MAA)
          .attr("class", "boldattu");

        if (valtio.HostInfo != "" && null) {
          parseHostInfot(valtio.HostInfo);
        }
          
        // Jäsennellään ja tulostetaan miesten ennätykset
        let ennatyksetM = document.getElementById("otsikko6");
        ennatyksetM.querySelectorAll('*').forEach(n => n.remove());

        if (valtio.RecordsM != null) {
          info = valtio.RecordsM.split(",");
          for (let i = 0; i < info.length; i++) {
            let p = document.createElement("p");
            p.textContent = info[i].trim();
            ennatyksetM.append(p);
          }
        }

        // Jäsennellään ja tulostetaan naisten ennätykset
        let ennatyksetW = document.getElementById("otsikko7");
        ennatyksetW.querySelectorAll('*').forEach(n => n.remove());

        if (valtio.RecordsW != null) {
          info = valtio.RecordsW.split(",");
          for (let i = 0; i < info.length; i++) {
            let p = document.createElement("p");
            p.textContent = info[i].trim();
            ennatyksetW.append(p);
          }
        }

        // Valittu valtio maalataan punaiseksi
        valtiot.transition().style("fill", null);
        d3.select(this).transition().style("fill", "#FF4C29");
      }
    };

    // Luodaan joka kisalle oma p ja linkki
    function parseHostInfot(info) {
      let infot = document.getElementById("otsikko5");
      infot.querySelectorAll('*').forEach(n => n.remove());

      info = info.split(",");
      for (let i = 0; i < info.length; i++) {
        let a = document.createElement("a");
        a.textContent = info[i].trim();
        a.style.color = "#FF4C29";
        s = info[i].substring(0, info[i].indexOf('('));
        a.href = `https://en.wikipedia.org/wiki/${s}`;
        let p = document.createElement("p");
        p.append(a);
        infot.append(p);
      }
    }

    luoTopLista();

    d3.select("#top_" + BOLDATTU_MAA)
      .attr("class", "boldattu");

    // Tässä tapahtuu zoomaaminen
    const zoom = d3.zoom()
      .scaleExtent([1, 6])  // Tästä säädetään kuinka syvälle saa zoomattua
      .translateExtent([[0, -200], [960, 550]])
      .on('zoom', zoomed);

    svg.call(zoom);

    function zoomed() {
      svg
        .selectAll('path')
        .attr('transform', d3.event.transform);
    }

    // Piiretään kartta
    const valtiot = svg.append("g")
      .attr("id", "kartta")
      .selectAll("path")
      .data(topo.features)
      .enter()
      .append("path")
      .attr("class", "topo")
      .attr("stroke", "grey")
      .attr("stroke-width", 0.5)
        // Piirretään jokainen valtio
        .attr("d", d3.geoPath()
          .projection(projection)
        )
        // Asetetaan väri jokaiselle valtiolle
        .attr("fill", function (d) {
          let valtio = TIETORAKENNE[d.id];
          let arvo = (valtio) ? (valtio[KENTAT[VALITTU_KENTTA]]) : (0);
          return colorScale(arvo);
        })
      .on("mouseover", mouseOver)
      .on("mousemove", function() {  // Tooltip seuraa hiirtä
        return tooltip
                .style("top", (d3.event.pageY-28)+"px")
                .style("left",(d3.event.pageX)+"px");})
      .on("mouseleave", mouseLeave)
      .on("click", click);

    // Selite heatmapille
    svg.append("g")
      .attr("class", "legendQuant");

    var legend = d3.legendColor()
      .labels(HEATMAP[KENTAT[VALITTU_KENTTA]].labels)
      .title(KENTAT[VALITTU_KENTTA])
      .scale(colorScale);

    svg.select(".legendQuant")
      .call(legend);
  }


  var NAPPAINYHDISTELMA = [];
  var NAPPAINAJASTIN;

  /**
   * Seuraa käyttäjän näppäimistönpainalluksia ja asettaa ajastimen näppäinyhdistelmälle
   */
  document.addEventListener("keydown", function(event) {
    NAPPAINYHDISTELMA.push(event.key);
    const maksimiPituus = 5;
    if (NAPPAINYHDISTELMA.length>=maksimiPituus) {
      lueYhdistelma();
    }
    if (!NAPPAINAJASTIN) {
      NAPPAINAJASTIN = setInterval(lueYhdistelma, 1000);
    }
  });

  /**
   * Lukee käyttäjän kirjoittaman näppäinyhdistelmän
   */
  function lueYhdistelma() {
    let yhdistelma = NAPPAINYHDISTELMA.slice();
    for (i in EASTEREGGS) {
      let easter = EASTEREGGS[i];
      if(easter.yhdistelma.toString()==yhdistelma.toString()) {
        easter.funktio();
      }
    }
    NAPPAINYHDISTELMA = [];
    clearInterval(NAPPAINAJASTIN);
    NAPPAINAJASTIN = null;
  }

  const EASTEREGGS = {
    "litkeissifamfr":{
      yhdistelma:["4","2","0","6","9"],
      funktio:easter_xd
    }
  };

  function easter_xd() {
    var emojit = ["😍","👌🏻","😤","🍆","😭","💦","😂","😩","🎅🏿","👀","🏃"];

    var tekstit = document.querySelectorAll('p, h1, h2, li, span');
    for (i = 0; i < tekstit.length; i++) {
      tekstit[i].innerHTML = generateMEME();
    }

    let container = document.querySelector(".flex-container");

    let index = 0;
    setInterval(function() {
      let meme = document.createElement("div");
      meme.innerHTML = emojit[randomInt(0, emojit.length - 1)];
      meme.style.fontSize = "120px";
      meme.style.position = "absolute";
      meme.style.left = `${randomInt(0, 90)}%`;
      meme.style.top = `${randomInt(0, 90)}%`;
      meme.style.zIndex = index++;
      container.appendChild(meme);
    }, 500);

    function randomInt(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function generateMEME() {
      var result = '';
      lkm = randomInt(5, 15);
      for ( var i = 0; i < lkm; i++ ) {
        result += emojit[(Math.floor(Math.random() * emojit.length))];
      }
      return result;
    }
  }
});
