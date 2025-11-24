let aTab = 0;
let tabCounter = 1;
let bTabs = [];
const tabCont = document.querySelector(".tabs");
let tabFrame;
let fUrl;
const inp = document.getElementById("searchbar");

inp.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    nav(inp.value);
    console.log("i");
  }
});

const connection = new BareMux.BareMuxConnection("/baremux/worker.js");
const wispUrl = localStorage.getItem("cherri_wispUrl") || "wss://wisp.rhw.one/";

const CONFIG = {
  files: {
    wasm: "/sj/scramjet.wasm.wasm",
    all: "/sj/scramjet.all.js",
    sync: "/sj/scramjet.sync.js",
  },
};

const { ScramjetController } = $scramjetLoadController();
const scramjet = new ScramjetController({
  files: CONFIG.files,
});
scramjet.init();

let searchE;

const se = localStorage.getItem("cherri_se") || "DuckDuckGo";
const bar = document.getElementById("urlbar");

if (se === "DuckDuckGo") {
  searchE = "https://duckduckgo.com/search?q=";
} else if (se === "Bing") {
  searchE = "https://bing.com/search?q=";
} else if (se === "Google") {
  searchE = "https://google.com/search?q=";
} else if (se === "Startpage") {
  searchE = "https://startpage.com/search?q=";
} else if (se === "https://qwant.com/search?q=") {
  bar.placeholder = "Search with Qwant or enter a URL here";
} else {
  bar.placeholder = "Search with Brave or enter a URL here";
}
connection.setTransport("/libcurl/index.mjs", [{ websocket: wispUrl }]);

function newTab() {
  const nTab = {
    id: tabCounter++,
    title: "New Tab",
    url: "",
    history: [],
    historyIndex: -1,
  };

  bTabs.push(nTab);
  if (!tabCont) return;

  const ntBtn = document.querySelector(".newtab");

  const tabElement = document.createElement("div");
  tabElement.classList.add("tab", "hcontainer");
  tabElement.dataset.tabId = nTab.id;
  tabElement.innerHTML = `
                <img src="/assets/img/fav.png" id="fav" data-fav-id="${nTab.id}" width="24" alt="">
                    <span>
                        New Tab
                    </span>
                <i class="ri-close-line close-btn ri"></i>
                `;

  tabElement.addEventListener("click", (e) => {
    if (!e.target.closest(".close-btn")) {
      switchTab(nTab.id);
    }
  });

  const closebtn = tabElement.querySelector(".close-btn");
  closebtn.addEventListener("click", (e) => {
    e.stopPropagation();
    closeTab(nTab.id);
    console.log("closed tab");
  });

  tabCont.insertBefore(tabElement, ntBtn);

  tabFrame = document.createElement("iframe");
  tabFrame.classList.add("viewframe", "browser-frame");
  tabFrame.dataset.frameId = nTab.id;
  tabFrame.setAttribute("allowfullscreen", "true");
  tabFrame.src = "/pages/home.html";

  document.body.appendChild(tabFrame);

  switchTab(nTab.id);
}

function switchTab(tId) {
  aTab = tId;

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("active", parseInt(tab.dataset.tabId) === tId);
  });

  document.querySelectorAll(".viewframe").forEach((frame) => {
    frame.classList.toggle("active", parseInt(frame.dataset.frameId) === tId);
  });

  const cTab = bTabs.find((t) => t.id === tId);
  if (cTab) {
    const input = document.getElementById("searchbar");
    if (input) input.value = cTab.url;
  }
}

function closeTab(tId) {
  if (bTabs.length === 1) {
    alert("You cannot close the last tab!");
    return;
  }

  const tIndex = bTabs.findIndex((t) => t.id === tId);
  if (tIndex === -1) return;

  bTabs.splice(tIndex, 1);

  const tEl = document.querySelector(`.tab[data-tab-id="${tId}"]`);
  const frame = document.querySelector(`.viewframe[data-frame-id="${tId}"]`);

  if (tEl) tEl.remove();
  if (frame) frame.remove();

  if (aTab === tId) {
    const newATab = bTabs[Math.max(0, tIndex - 1)];
    if (newATab) {
      switchTab(newATab.id);
      console.log("woah");
    }
  }
}

function nav(i) {
  console.log("e");
  if (!i.trim()) return;

  let url = i.trim();

  if (!url.includes(".") || url.includes(" ")) {
    url = searchE + encodeURIComponent(url);
  } else {
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }
  }

  const cTab = bTabs.find((t) => t.id === aTab);
  if (!cTab) return;

  cTab.history.push(url);
  cTab.historyIndex++;

  cTab.url = url;

  const fUrl = scramjet.encodeUrl(url);

  go(fUrl);
}

async function go(u) {
  if (!(await connection.getTransport())) {
    connection.setTransport("/libcurl/index.mjs", [{ websocket: wispUrl }]);
  }

  console.log("a");
  const cTab = bTabs.find((t) => t.id === aTab);
  const favEl = document.querySelector(`#fav[data-fav-id="${aTab}"]`);
  const viewframe = document.querySelector(
    `.viewframe[data-frame-id="${aTab}"]`
  );
  if (!viewframe) return;

  const ubar = document.getElementById("searchbar");

  const tabEl = document.querySelector(`.tab[data-tab-id="${aTab}"]`);
  if (tabEl) {
    const titleEl = tabEl.querySelector("span");
    if (titleEl) titleEl.textContent = "Loading...";
  }

  if (ubar) ubar.value = cTab.url;
  const favUrl = cTab.url;
  if (favEl)
    favEl.src = `https://www.google.com/s2/favicons?domain=${favUrl}&sz=256`;

  try {
    viewframe.src = u;
    console.log("ooooo");

    viewframe.onload = () => {
      try {
        const iframeDoc =
          viewframe.contentDocument || viewframe.contentWindow.document;
        const title = iframeDoc.title || new URL(cTab.url).hostname;

        const tabEl = document.querySelector(`.tab[data-tab-id="${aTab}"]`);
        if (tabEl) {
          const titleEl = tabEl.querySelector("span");
          if (titleEl) titleEl.textContent = title;
        }

        updateUrlFromIframe(viewframe);
      } catch (e) {
        console.error("Error accessing iframe content:", e);
        const tabEl = document.querySelector(`.tab[data-tab-id="${aTab}"]`);
        if (tabEl) {
          const titleEl = tabEl.querySelector("span");
          if (titleEl) titleEl.textContent = new URL(cTab.url).hostname;
        }

        updateUrlFromIframe(viewframe);
      }
    };
  } catch (e) {
    console.error("There was an error while loading the page:", e);
  }
}

function b() {
  const cTab = bTabs.find((t) => t.id === aTab);
  if (!cTab || cTab.historyIndex <= 0) return;

  cTab.historyIndex--;
  const u = cTab.history[cTab.historyIndex];
  cTab.url = u;
  let furl;
  const ba = localStorage.getItem("breeze_backend");
  if (ba.toLowerCase() === "scramjet") {
    furl = scramjet.encodeUrl(u);
  } else if (ba.toLowerCase() === "ultraviolet") {
    furl = __uv$config.prefix + __uv$config.encodeUrl(u);
  } else {
    furl = scramjet.encodeUrl(u);
  }

  go(furl);
}

function f() {
  const cTab = bTabs.find((t) => t.id === aTab);

  cTab.historyIndex++;
  const u = cTab.history[cTab.historyIndex];
  cTab.url = u;
  let furl;
  const ba = localStorage.getItem("breeze_backend");
  if (ba.toLowerCase() === "scramjet") {
    furl = scramjet.encodeUrl(u);
  } else if (ba.toLowerCase() === "ultraviolet") {
    furl = __uv$config.prefix + __uv$config.encodeUrl(u);
  } else {
    furl = scramjet.encodeUrl(u);
  }

  go(furl);
}

function r() {
  const viewframe = document.querySelector(
    `.viewframe[data-frame-id="${aTab}"]`
  );
  const curl = viewframe.src;

  viewframe.src = curl;
}

function full() {
  const viewframe = document.querySelector(
    `.viewframe[data-frame-id="${aTab}"]`
  );
  viewframe.requestFullscreen();
  console.log("sdfkjhasdkjhfg");
}

function updateUrlFromIframe(viewframe) {
  try {
    const cTab = bTabs.find((t) => t.id === aTab);
    if (!cTab) return;

    let decodedUrl;
    const currentSrc = viewframe.src;

    decodedUrl = scramjet.decodeUrl(currentSrc);

    if (decodedUrl && decodedUrl !== cTab.url) {
      cTab.url = decodedUrl;

      const ubar = document.getElementById("searchbar");
      if (ubar) ubar.value = decodedUrl;

      const favEl = document.querySelector(`#fav[data-fav-id="${aTab}"]`);
      if (favEl)
        favEl.src = `https://www.google.com/s2/favicons?domain=${decodedUrl}&sz=256`;
    }
  } catch (e) {
    console.error("Error updating URL from iframe:", e);
  }
}

const viewframe = document.querySelector(
  `.viewframe[data-frame-id="${aTab}"]`
);

setInterval(() => {
    if (viewframe) {
        updateUrlFromIframe(viewframe);
    }
}, 1000);

newTab()