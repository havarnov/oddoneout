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
            return { title: randomPage.title };
        })
        .then(r => {
                return r;
            })
        .catch(function(error){console.log(error);});
}

function fetchOutgoingPageTitles(pageTitle) {

    let params = {
        action: "query",
        titles: pageTitle,
        prop: "links",
        pllimit: "max",
        format: "json"
    };

    let url = createUrl(params);

    return fetch(url)
        .then(response => response.json())
        .then(function(response) {
            let pages = Object.values(response.query.pages)[0].links;
            if (!pages)
            {
                return [];
            }

            return pages
                .filter(i => i.ns === 0)
                .map(i => { return { title: i.title }; });
        })
        .then(r => {
            return r;
        })
        .catch(function(error){console.log(error);});
}


async function fetchRandomLinked(pageTitle) {
    let links = await fetchOutgoingPageTitles(pageTitle);
    if (links.length === 0) {
        return null;
    }

    let item = links[Math.floor(Math.random() * links.length)];
    return { random: item, rest: links.filter(i => i.title !== item.title) };
}

async function create(n, progress) {
    let res = [];
    let e = [];
    let e_rest = [];

    res.push(await fetchRandom());

    while (res.length < n) {
        let item = res[Math.floor(Math.random() * res.length)];
        let resRandom = await fetchRandomLinked(item.title);

        if (!resRandom)
        {
            continue;
        }

        let l = resRandom.random;

        if (l.title && !res.find(i => i.title === l.title))
        {
            res.push(l);
            e.push({sourceTitle: item.title, targetTitle: l.title });
            resRandom.rest.forEach(i => e_rest.push({ sourceTitle: item.title, targetTitle: i.title }));
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
    let oddone = null;
    let outgoing = null;
    do {
        oddone = await fetchRandom();
        outgoing = await fetchOutgoingPageTitles(oddone.title);
    } while (outgoing.find(o => r.pages.map(p => p.title).find(pt => pt === o.title)));

    r.pages.push(oddone);
    r.edges.forEach(e => edges_blueprint.push(e));
    r.pages.forEach(i => {
        nodes.add({id: i.title, label: i.title });
    });
    r.edges_rest.forEach(e => {
        let i = r.pages.findIndex(p => p.title === e.targetTitle);
        if (i !== -1 && !edges_blueprint.find(p => p.sourceTitle === e.sourceTitle && r.pages[i].title === p.targetTitle)) {
            edges_blueprint.push({ sourceTitle: e.sourceTitle, targetTitle: r.pages[i].title });
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
        if (edges_blueprint.find(e => e.sourceTitle === clickedNodeId || e.targetTitle === clickedNodeId))
        {
            console.log("failed");
            nodes.update({ id: clickedNodeId, color: 'red' });
        }
        else
        {
            console.log("correct");
            nodes.update({ id: clickedNodeId, color: 'green' });
            edges.add(edges_blueprint.map(e => { return {id: (e.sourceTitle + e.targetTitle), from: e.sourceTitle, to: e.targetTitle}; }));
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
