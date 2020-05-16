let nodes = null;
let edges = null;
let edges_blueprint = [];

function createUrl(params) {
    let url = "https://en.wikipedia.org/w/api.php";

    url = url + "?origin=*";
    Object.keys(params).forEach(function(key){url += "&" + key + "=" + params[key];});

    return url;
}

function fetchRandom() {
    let params = {
        action: "query",
        format: "json",
        list: "random",
        rnnamespace: 0,
        rnlimit: "1"
    };

    let url = createUrl(params);

    return fetch(url)
        .then(response => response.json())
        .then(function(response) {
            let randomPage = response.query.random[0];
            return { title: randomPage.title, id: randomPage.id };
        })
        .then(r => {
                return r;
            })
        .catch(function(error){console.log(error);});
}

function fetchOutgoingPageTitles(pageId) {

    let params = {
        action: "query",
        pageids: pageId,
        prop: "links",
        pllimit: "max",
        format: "json"
    };

    let url = createUrl(params);

    return fetch(url)
        .then(response => response.json())
        .then(function(response) {
            let pages = response.query.pages[pageId].links;
            if (!pages)
            {
                return [];
            }

            return pages
                .filter(i => i.ns === 0)
                .map(i => { return { title: i.title, id: null }; });
        })
        .then(r => {
            return r;
        })
        .catch(function(error){console.log(error);});
}


function fetchIdByTitle(title) {

    let title_n = title.replace(/\s/g, "_");

    // https://en.wikipedia.org/w/api.php?action=query&titles=MOS:FILM&pllimit=max&format=json
    let params = {
        action: "query",
        titles: title_n,
        format: "json"
    };

    let url = createUrl(params);

    return fetch(url)
        .then(response => response.json())
        .then(function(response) {
            return { title: title, id: Object.keys(response.query.pages)[0] };
        })
        .then(r => {
            return r;
        })
        .catch(function(error){console.log(error);});
}

async function fetchRandomLinked(pageId) {
    let links = await fetchOutgoingPageTitles(pageId);
    let item = links[Math.floor(Math.random() * links.length)];

    item = await fetchIdByTitle(item.title);
    return { random: item, rest: links.filter(i => i.title !== item.title) };
}

async function create(n, progress) {
    let res = [];
    let e = [];
    let e_rest = [];

    res.push(await fetchRandom());

    while (res.length < n) {
        let item = res[Math.floor(Math.random() * res.length)];
        let resRandom = await fetchRandomLinked(item.id);

        let l = resRandom.random;

        if (l.id && !res.find(i => i.id === l.id))
        {
            res.push(l);
            e.push({ source: item.id, target: l.id });
            resRandom.rest.forEach(i => e_rest.push({ source: item.id, targetTitle: i.title }));
            progress(res.length, n + 1);
        }
    }

    return { pages: res, edges: e, edges_rest: e_rest};
}

function progress(i, tot) {
    let btn = document.getElementById("start");
    btn.innerText = "working (" + i + "/" + tot + ")";
    if (i === tot)
    {
        btn.innerText = "restart";
    }
}

async function add() {
    // reset
    if (nodes) {
        nodes.clear();
    }

    if (edges) {
        edges.clear();
    }

    edges_blueprint = [];

    let btn = document.getElementById("start");
    let nInput = document.getElementById("n");
    btn.disabled = true;
    btn.innerText = "restart";
    let r = await create(nInput.value - 1, progress);
    let oddone = await fetchRandom();
    let outgoing = await fetchOutgoingPageTitles(oddone.id);
    while (outgoing.find(o => r.pages.map(p => p.title).find(pt => pt === o.title))) {
        oddone = await fetchRandom();
        outgoing = await fetchOutgoingPageTitles(oddone.id);
    }
    r.pages.push(oddone);
    r.edges.forEach(e => edges_blueprint.push(e));
    r.pages.forEach(i => {
        nodes.add({id: i.id, label: i.title });
    });
    r.edges_rest.forEach(e => {
        let i = r.pages.findIndex(p => p.title === e.targetTitle);
        if (i !== -1 && !edges_blueprint.find(p => p.source === e.source && r.pages[i].id === p.target)) {
            edges_blueprint.push({ source: e.source, target: r.pages[i].id });
        }
    });

    progress(n + 1, n + 1);
    btn.disabled = false;
}

function main() {
    // create an array with nodes
    nodes = new vis.DataSet([]);

    // create an array with edges
    edges = new vis.DataSet([]);

    var container = document.getElementById("mynetwork");
    var data = {
        nodes: nodes,
        edges: edges
    };
    var options = {
        layout: {
            randomSeed: Math.random(),
        }
    };
    var network = new vis.Network(container, data, options);

    network.on("click", function (params) {
        if (params.nodes.length === 0 || edges_blueprint.length === 0) {
            return;
        }

        let clickedNodeId = params.nodes[0];
        if (edges_blueprint.find(e => e.source === clickedNodeId || e.target === clickedNodeId))
        {
            console.log("failed");
            nodes.update({ id: clickedNodeId, color: 'red' });
        }
        else
        {
            console.log("correct");
            nodes.update({ id: clickedNodeId, color: 'green' });
            edges.add(edges_blueprint.map(e => { return {id: (e.source + e.target), from: e.source, to: e.target}; }));
            edges_blueprint = [];
            var btn = document.getElementById("start");
            btn.disabled = false;
        }
    });
}

document.addEventListener(
    'DOMContentLoaded',
     main,
    false);
