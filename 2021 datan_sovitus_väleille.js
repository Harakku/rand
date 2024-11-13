// node.js
// Mitalimäärien jakaminen sopiville väleille, jotta värit jakautuvat kartalla järkevästi.
// Oli tarkoitus luoda lista automaattisesti mutta on tästäkin jokunen apu manuaaliseen työhön

let lajit = [
    "Aeronautics", "Alpine Skiing", "Alpinism", "Archery", "Art Competitions", "Athletics", "Badminton",
    "Baseball", "Basketball", "Basque Pelota", "Beach Volleyball", "Biathlon", "Bobsleigh", "Boxing", "Canoeing",
    "Cricket", "Croquet", "Cross Country Skiing", "Curling", "Cycling", "Diving", "Equestrianism", "Fencing",
    "Figure Skating", "Football", "Freestyle Skiing", "Golf", "Gymnastics", "Handball", "Hockey", "Ice Hockey",
    "Jeu De Paume", "Judo", "Lacrosse", "Luge", "Military Ski Patrol", "Modern Pentathlon", "Motorboating",
    "Nordic Combined", "Polo", "Racquets", "Rhythmic Gymnastics", "Roque", "Rowing", "Rugby", "Rugby Sevens",
    "Sailing", "Shooting", "Short Track Speed Skating", "Skeleton", "Ski Jumping", "Snowboarding", "Softball",
    "Speed Skating", "Swimming", "Synchronized Swimming", "Table Tennis", "Taekwondo", "Tennis", "Trampolining",
    "Triathlon", "Tug-Of-War", "Volleyball", "Water Polo", "Weightlifting", "Wrestling"
];

const tietorakenne = require("../data/tietorakenne.json");

for (let laji of lajit) {
    //laskeLajinValit("Aeronautics");
    console.log(laji + ":");
    laskeLajinValit(laji);
}

function laskeLajinValit(laji) {
    let mitalimaarat = [];
    for (let valtiokoodi in tietorakenne) {
        let valtio = tietorakenne[valtiokoodi];
        mitalimaarat.push(valtio[laji]);
    }
    tasainenJako(mitalimaarat);
}

function tasainenJako(mitalimaarat) {
    const VALIEN_MAARA = 7;

    let mitalijako = {};
    let max = Math.max(...mitalimaarat);
    let min = 0;  // mitaleita ei voi olla vähemmän kuin 0
    let kasvu = Math.ceil((max-min) / (VALIEN_MAARA-1));
    let valienLoput = Array(VALIEN_MAARA).fill(kasvu);
    valienLoput[0] = min;
    for (let i = 0; i < valienLoput.length; i++) {
        valienLoput[i] = valienLoput[i] * i;
    }
    let eroMaarassaAsken;
    let eroMaarassaNyt = Number.MAX_VALUE;
    // Ajetaan koodia useampaan kertaan ja pysäytetään, kun saadaan aiempaa huonompi tulos
    /*
    do {
        eroMaarassaAsken = eroMaarassaNyt;
        */

        //let valit1 = _getValit_v1(mitalimaarat, VALIEN_MAARA);
        let valit = _getValit_v2(mitalimaarat, valienLoput);

        for (let vali of valit) {
            mitalijako[vali.alku] = [];
        }
        for (let mitalimaara of mitalimaarat) {
            for (let vali of valit) {
                if (mitalimaara <= vali.loppu) {
                    mitalijako[vali.alku].push(mitalimaara);
                    break;
                }
            }
        }
        /*
        valienLoput = _getValienLoput(mitalijako, valienLoput);

        let suurinMitalivali = 0;
        let pieninMitalivali = Number.MAX_VALUE;
        for (let mitalivali in mitalijako) {
            let valinKoko = mitalijako[mitalivali].length;
            if (valinKoko > suurinMitalivali) {
                suurinMitalivali = valinKoko;
            } else if (valinKoko < pieninMitalivali) {
                pieninMitalivali = valinKoko;
            }
        }
        eroMaarassaNyt = suurinMitalivali - pieninMitalivali;
        
    } while (eroMaarassaNyt < eroMaarassaAsken);
    */

    // Pikaista silmämääräistä selvitystä varten
    delete mitalijako[0];
    for (let vali in mitalijako) {
        if (mitalijako[vali].length == 0) {
            delete mitalijako[vali];
        } else {
            mitalijako[vali].sort((a, b) => parseInt(a) - parseInt(b));
        }
    }
    console.dir(mitalijako, {'maxArrayLength': null});
}

function _getValit_v1(mitalimaarat, valienMaara) {
    let max = Math.max(...mitalimaarat);
    let min = 0;  // mitaleita ei voi olla vähemmän kuin 0
    let kasvu = Math.ceil((max-min) / (valienMaara-1));
    let valit = [{"alku": min, "loppu": min}];  // eka väli
    let valinAlku = min+1;
    for (let i = 1; i < valienMaara; i++) {
        let valinLoppu = min + kasvu*i;
        if (valinLoppu < max) {
            valit.push({"alku": valinAlku, "loppu": valinLoppu});
        } else {
            valit.push({"alku": valinAlku, "loppu": max});
            break;
        }
        valinAlku = valinLoppu+1;
    }
    return valit;
}


function _getValit_v2(mitalimaarat, valienLoput) {
    let valit = [];
    let valinAlku = 0;
    let valinLoppu;
    for (let i = 0; i < valienLoput.length-1; i++) {
        valinLoppu = valienLoput[i];
        valit.push({"alku": valinAlku, "loppu": valinLoppu});
        valinAlku = valinLoppu+1;
    }
    // Käytännössä valienLoput-listan viimeinen arvo jätetään huomiotta, koska viimeinen väli jatkuu "äärettömään"
    valit.push({"alku": valinAlku, "loppu": Number.MAX_VALUE});
    return valit;
}

function _getValienLoput(mitalijako, valienLoput) {
    let tasainenMaara = 0;
    for (let vali of valienLoput) {
        console.log(mitalijako[vali+1]);
        console.log(vali+1);
    }
}

function pyoristaLahimpaanKerrannalliseen(arvo, kerrannallinen=1) {
    if (kerrannallinen === 1) return arvo;
    return Math.round(arvo / kerrannallinen) * kerrannallinen;
}
