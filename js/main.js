// ECODRY, intro fade, scroll reveals, basket count and the animation layer.
(function () {
  "use strict";

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(pointer: fine)").matches;

  // Hero headline: split into words so they can rise in one by one.
  var h1 = document.querySelector(".hero h1");
  (function splitWords() {
    if (!h1) return;
    var idx = 0;
    function process(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) {
              frag.appendChild(document.createTextNode(" "));
            } else {
              var w = document.createElement("span");
              w.className = "w";
              var wi = document.createElement("span");
              wi.className = "wi";
              wi.textContent = part;
              wi.style.transitionDelay = idx * 75 + "ms";
              idx += 1;
              w.appendChild(wi);
              frag.appendChild(w);
            }
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1) {
          process(child);
        }
      });
    }
    process(h1);
  })();

  // Logo intro: hold briefly, then fade into the page and start the hero words.
  var intro = document.getElementById("intro");
  function hideIntro() {
    document.body.classList.add("hero-play");
    if (!intro || intro.classList.contains("done")) return;
    intro.classList.add("done");
    setTimeout(function () { intro.remove(); }, 800);
  }
  window.addEventListener("load", function () {
    setTimeout(hideIntro, 1500);
  });
  setTimeout(hideIntro, 3500); // safety net if load is slow
  if (intro) intro.addEventListener("click", hideIntro);

  // Gentle fade and rise as sections scroll into view. Once an element has
  // settled, clear its stagger delay (so hovers stay snappy) and mark cards
  // and the hero media as live so their pointer tilt can take over.
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var el = entry.target;
          el.classList.add("in");
          io.unobserve(el);
          setTimeout(function () {
            el.style.transitionDelay = "0ms";
            if (el.classList.contains("card") || el.classList.contains("hero-media")) {
              el.classList.add("live");
            }
          }, 1000);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

  // Steps connector line: draw itself as the section scrolls into view.
  var stepsLayout = document.querySelector(".steps-layout");
  if (stepsLayout) {
    if ("IntersectionObserver" in window) {
      var lineIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            stepsLayout.classList.add("in-view");
            lineIO.disconnect();
          }
        });
      }, { threshold: 0.25 });
      lineIO.observe(stepsLayout);
    } else {
      stepsLayout.classList.add("in-view");
    }
  }

  // Pointer tilt helper: feeds --rx and --hry style variables on an element.
  function addTilt(el, maxDeg, rxVar, ryVar) {
    if (!el) return;
    var raf = null;
    el.addEventListener("pointermove", function (ev) {
      var cx = ev.clientX;
      var cy = ev.clientY;
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = null;
        var r = el.getBoundingClientRect();
        if (!r.width || !r.height) return;
        var px = (cx - r.left) / r.width - 0.5;
        var py = (cy - r.top) / r.height - 0.5;
        el.style.setProperty(ryVar, (px * maxDeg).toFixed(2) + "deg");
        el.style.setProperty(rxVar, (-py * maxDeg).toFixed(2) + "deg");
      });
    });
    el.addEventListener("pointerleave", function () {
      el.style.setProperty(rxVar, "0deg");
      el.style.setProperty(ryVar, "0deg");
    });
  }
  if (finePointer && !reducedMotion) {
    addTilt(document.querySelector(".hero-media"), 7, "--hrx", "--hry");
    document.querySelectorAll(".grid .card").forEach(function (card) {
      addTilt(card, 8, "--rx", "--ry");
    });
  }

  // Basket: every Add raises the count and confirms with a toast. When the
  // pouch thumbnail can fly, the count lands together with the basket bounce.
  var count = 0;
  var cartCount = document.getElementById("cartCount");
  var cartBtn = document.getElementById("cartBtn");
  var toast = document.getElementById("toast");
  var toastTimer = null;

  function showToast(text) {
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("show"); }, 2200);
  }

  var total = 0;
  var cartTotal = document.getElementById("cartTotal");
  function bumpCount(amount) {
    count += 1;
    total += (amount || 0);
    if (cartTotal) cartTotal.textContent = "₹" + total;
    if (cartCount) {
      cartCount.textContent = String(count);
      cartCount.classList.remove("pop");
      void cartCount.offsetWidth; // restart the pop animation
      cartCount.classList.add("pop");
    }
    if (cartBtn) {
      cartBtn.classList.remove("bounce");
      void cartBtn.offsetWidth; // restart the bounce animation
      cartBtn.classList.add("bounce");
    }
  }

  function flyToBasket(img, done) {
    var r1 = img.getBoundingClientRect();
    var r2 = cartBtn.getBoundingClientRect();
    var ghost = img.cloneNode();
    ghost.removeAttribute("id");
    ghost.className = "fly-ghost";
    ghost.style.left = r1.left + "px";
    ghost.style.top = r1.top + "px";
    ghost.style.width = r1.width + "px";
    ghost.style.height = r1.height + "px";
    document.body.appendChild(ghost);
    var dx = r2.left + r2.width / 2 - (r1.left + r1.width / 2);
    var dy = r2.top + r2.height / 2 - (r1.top + r1.height / 2);
    var finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      if (ghost.parentNode) ghost.remove();
      done();
    }
    var anim = ghost.animate([
      { transform: "translate(0px, 0px) scale(1)", opacity: "1" },
      { transform: "translate(" + dx * 0.45 + "px, " + (dy - 110) + "px) scale(.5)", opacity: ".92", offset: 0.55 },
      { transform: "translate(" + dx + "px, " + dy + "px) scale(.06)", opacity: ".3" }
    ], { duration: 780, easing: "cubic-bezier(.3,.65,.4,1)" });
    if (anim) {
      anim.onfinish = finish;
      anim.oncancel = finish;
      setTimeout(finish, 1000); // safety net
    } else {
      finish();
    }
  }

  document.querySelectorAll(".btn-add").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var name = btn.getAttribute("data-name") || "pouch";
      showToast("Added " + name + " to your basket");
      btn.classList.remove("pulse");
      void btn.offsetWidth;
      btn.classList.add("pulse");
      var original = btn.textContent;
      btn.textContent = "Added ✓";
      btn.classList.add("added");
      setTimeout(function () {
        btn.textContent = original;
        btn.classList.remove("added");
      }, 1400);
      var price = parseInt(btn.getAttribute("data-price") || "0", 10) || 0;
      var card = btn.closest ? btn.closest(".card") : null;
      var img = card ? card.querySelector(".card-media img") : null;
      if (img && cartBtn && !reducedMotion && typeof img.animate === "function") {
        flyToBasket(img, function () { bumpCount(price); });
      } else {
        bumpCount(price);
      }
    });
  });

  if (cartBtn) {
    cartBtn.addEventListener("click", function () {
      if (count === 0) {
        showToast("Your basket is empty, add a pouch to start");
      } else {
        showToast("Your basket holds " + count + (count === 1 ? " pouch" : " pouches") + ", total ₹" + total);
      }
    });
  }

  // ---------- Product detail sheet ----------
  var PRODUCTS = {
    moringa: {
      name: "Moringa Powder", price: "₹400", weight: "100 g",
      code: "Batch ECO-MOR-250", priceNum: 400, cover: "₹400 covers one sealed 100 g pouch, about 20 daily spoons.", img: "img/pouch-moringa.webp",
      alt: "ECODRY Moringa Powder pouch with fresh moringa leaves and a bowl of green powder",
      kicker: "The everyday green", line: "The everyday green for energy and immunity.",
      what: "Finely ground moringa leaves, picked young while they are deep green and full of flavour. It is the classic daily green of the range: mild, leafy and easy to stir into almost anything.",
      inside: ["100% moringa leaves, washed, sun-dried and ground", "Naturally rich in iron, calcium and vitamin A", "No other ingredient in the pouch"],
      made: ["Fresh moringa leaves are hand picked in the morning and sorted leaf by leaf.", "The leaves are washed in clean water and shaken dry.", "They are spread in thin layers on clean drying trays under the sun for 2 to 3 days, turned often so they dry evenly.", "Once crisp, the leaves are stone ground in a small batch into a fine green powder.", "The powder is sieved, sealed fresh in the pouch and labelled by batch."],
      use: ["Scoop one small spoon, about 5 g, of Moringa Powder from the pouch.", "Add it to warm water, milk, a smoothie or your morning juice.", "Stir well or blend for ten seconds until the green melts in.", "Sip slowly, once a day, and make it your quiet morning habit."],
      data: [["Weight", "100 g"], ["Servings", "About 20 spoons"], ["Spoon size", "About 5 g"], ["Shelf life", "6 months, sealed"], ["Sun drying", "2 to 3 days"], ["Batch", "Small batch"]]
    },
    banana: {
      name: "Raw Banana Powder", price: "₹160", weight: "200 g",
      code: "Batch ECO-BAN-241", priceNum: 160, cover: "₹160 covers one sealed 200 g pouch, about 40 daily spoons.", img: "img/pouch-banana.webp",
      alt: "ECODRY Raw Banana Powder pouch with fresh bananas and a bowl of powder",
      kicker: "Gentle and filling", line: "Gentle prebiotic goodness for happy tummies.",
      what: "Raw green bananas, peeled and dried before they ripen, then ground into a soft, pale powder. It is mild, slightly creamy and known for gentle prebiotic fibre that suits the whole family.",
      inside: ["100% raw green banana, peeled, sun-dried and ground", "Natural prebiotic fibre from the raw fruit", "No other ingredient in the pouch"],
      made: ["Firm raw green bananas are picked, peeled by hand and sliced into thin rounds.", "The slices are laid on clean drying trays in a single layer.", "They dry slowly under the sun for 3 to 4 days until they snap cleanly.", "The dried slices are ground in a small batch into a soft, fine powder.", "The powder is sieved, sealed fresh in the pouch and labelled by batch."],
      use: ["Scoop one small spoon, about 5 g, of Raw Banana Powder from the pouch.", "Add it to warm milk, a smoothie, porridge or your morning drink.", "Stir well or blend for ten seconds until it turns smooth and creamy.", "Sip or eat slowly, once a day, as a gentle start for the tummy."],
      data: [["Weight", "200 g"], ["Servings", "About 40 spoons"], ["Spoon size", "About 5 g"], ["Shelf life", "6 months, sealed"], ["Sun drying", "3 to 4 days"], ["Batch", "Small batch"]]
    },
    broccoli: {
      name: "Broccoli Powder", price: "₹110", weight: "100 g",
      code: "Batch ECO-BRO-238", priceNum: 110, cover: "₹110 covers one sealed 100 g pouch, about 20 daily spoons.", img: "img/pouch-broccoli.webp",
      alt: "ECODRY Broccoli Powder pouch with fresh broccoli and a bowl of green powder",
      kicker: "Greens in a spoon", line: "A full serving of greens in a single spoon.",
      what: "Fresh broccoli florets, dried while they are bright green and ground fine. One spoon folds a serving of real greens into soups, eggs and smoothies, even on days when no vegetable reaches the plate.",
      inside: ["100% broccoli florets, washed, sun-dried and ground", "Naturally rich in fibre, vitamin C and folate", "No other ingredient in the pouch"],
      made: ["Fresh broccoli heads are cut into small florets and sorted by hand.", "The florets are washed in clean water and drained well.", "They are spread on clean drying trays under the sun for 2 to 3 days, turned often.", "Once fully dry and crisp, the florets are ground in a small batch into a fine powder.", "The powder is sieved, sealed fresh in the pouch and labelled by batch."],
      use: ["Scoop one small spoon, about 5 g, of Broccoli Powder from the pouch.", "Add it to a smoothie, soup, dal, scrambled eggs or your morning juice.", "Stir well or blend for ten seconds until the greens blend right in.", "Sip or eat slowly, once a day, and count it as your greens done."],
      data: [["Weight", "100 g"], ["Servings", "About 20 spoons"], ["Spoon size", "About 5 g"], ["Shelf life", "5 months, sealed"], ["Sun drying", "2 to 3 days"], ["Batch", "Small batch"]]
    },
    mango: {
      name: "Raw Mango Powder", price: "₹180", weight: "100 g",
      code: "Batch ECO-MAN-246", priceNum: 180, cover: "₹180 covers one sealed 100 g pouch, about 20 to 30 uses.", img: "img/pouch-mango.webp",
      alt: "ECODRY Raw Mango Powder pouch with raw mangoes and a bowl of powder",
      kicker: "Tangy amchur", line: "Tangy amchur for chaats, curries and coolers.",
      what: "Traditional amchur made from raw, unripe mangoes. Sour, bright and full of tang, it is the spoon that wakes up chaats, curries, chutneys and summer coolers when fresh lemon is not at hand.",
      inside: ["100% raw unripe mango, peeled, sun-dried and ground", "Natural tang and vitamin C from the raw fruit", "No other ingredient in the pouch"],
      made: ["Raw unripe mangoes are picked firm and sour, then peeled by hand.", "The flesh is cut into thin slices so it dries evenly.", "The slices dry under the sun for 3 to 4 days until hard and pale.", "The dried slices are ground in a small batch into a fine tangy powder.", "The powder is sieved, sealed fresh in the pouch and labelled by batch."],
      use: ["Scoop half to one small spoon of Raw Mango Powder from the pouch.", "Add it to chaat, curries, chutneys, raita or a chilled summer cooler.", "Stir well and taste, then add a little more if you like it tangier.", "Enjoy straight away, while the tang is bright and fresh."],
      data: [["Weight", "100 g"], ["Servings", "About 20 to 30 uses"], ["Spoon size", "About 3 to 5 g"], ["Shelf life", "8 months, sealed"], ["Sun drying", "3 to 4 days"], ["Batch", "Small batch"]]
    },
    beetroot: {
      name: "Beetroot Powder", price: "₹220", weight: "100 g",
      code: "Batch ECO-BET-252", priceNum: 220, cover: "₹220 covers one sealed 100 g pouch, about 20 daily spoons.", img: "img/pouch-beetroot.webp",
      alt: "ECODRY Beetroot Powder pouch with fresh beetroot and a bowl of deep pink powder",
      kicker: "Colour and stamina", line: "Natural colour and stamina for active days.",
      what: "Deep red beetroot, dried and ground into a vivid pink powder. It brings natural colour to drinks and bakes, and it is a favourite before workouts for steady, plant based stamina.",
      inside: ["100% beetroot, peeled, sun-dried and ground", "Natural nitrates and betalain colour from the root", "No other ingredient in the pouch"],
      made: ["Fresh beetroot is washed, peeled by hand and sliced into thin rounds.", "The slices are spread on clean drying trays in a single layer.", "They dry slowly under the sun for 3 to 4 days until crisp and deep red.", "The dried slices are ground in a small batch into a fine pink powder.", "The powder is sieved, sealed fresh in the pouch and labelled by batch."],
      use: ["Scoop one small spoon, about 5 g, of Beetroot Powder from the pouch.", "Add it to water, milk, a smoothie, juice or your pre workout drink.", "Stir well or blend for ten seconds until the colour turns deep pink.", "Sip slowly, once a day, about an hour before an active session if you like."],
      data: [["Weight", "100 g"], ["Servings", "About 20 spoons"], ["Spoon size", "About 5 g"], ["Shelf life", "6 months, sealed"], ["Sun drying", "3 to 4 days"], ["Batch", "Small batch"]]
    },
    turmeric: {
      name: "Turmeric Powder", price: "₹150", weight: "100 g",
      code: "Batch ECO-TUR-255", priceNum: 150, cover: "₹150 covers one sealed 100 g pouch, about 25 to 30 uses.", img: "img/pouch-turmeric.webp",
      alt: "ECODRY Turmeric Powder pouch with turmeric roots and a bowl of golden powder",
      kicker: "Golden haldi", line: "Golden haldi for warm milk and daily cooking.",
      what: "Sun cured turmeric fingers, ground into a rich golden haldi. Warm, earthy and deeply coloured, it is the everyday spoon for haldi milk, curries and daily cooking.",
      inside: ["100% turmeric fingers, boiled, sun-dried and ground", "Natural curcumin colour and warmth from the root", "No other ingredient in the pouch"],
      made: ["Fresh turmeric fingers are washed and boiled until just tender, the traditional first step for haldi.", "The fingers are spread on clean drying trays under the sun for 5 to 7 days until hard.", "They are turned often so every finger dries through and keeps its deep colour.", "The dried fingers are ground in a small batch into a fine golden powder.", "The powder is sieved, sealed fresh in the pouch and labelled by batch."],
      use: ["Scoop half to one small spoon of Turmeric Powder from the pouch.", "Add it to warm milk for haldi doodh, or into curries and dals as they cook.", "Stir well and let it simmer for a minute so the colour blooms.", "Sip or eat slowly, once a day, and enjoy the warm golden glow."],
      data: [["Weight", "100 g"], ["Servings", "About 25 to 30 uses"], ["Spoon size", "About 3 to 5 g"], ["Shelf life", "8 months, sealed"], ["Sun drying", "5 to 7 days"], ["Batch", "Small batch"]]
    }
  };

  var sheet = document.getElementById("productSheet");
  var scrim = document.getElementById("sheetScrim");
  var sheetClose = document.getElementById("sheetClose");
  var sheetAdd = document.getElementById("sheetAdd");
  var currentProduct = null;
  var lastFocus = null;

  function fillList(id, items, ordered) {
    var el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = "";
    items.forEach(function (txt) {
      var li = document.createElement("li");
      li.textContent = txt;
      el.appendChild(li);
    });
  }
  function openSheet(id) {
    var prod = PRODUCTS[id];
    if (!prod || !sheet) return;
    currentProduct = prod;
    lastFocus = document.activeElement;
    document.getElementById("sheetImg").src = prod.img;
    document.getElementById("sheetImg").alt = prod.alt;
    document.getElementById("sheetKicker").textContent = prod.kicker;
    document.getElementById("sheetTitle").textContent = prod.name;
    document.getElementById("sheetCode").textContent = prod.code;
    document.getElementById("sheetLine").textContent = prod.line;
    document.getElementById("sheetPrice").textContent = prod.price;
    document.getElementById("sheetCover").textContent = prod.cover;
    document.getElementById("sheetWeight").textContent = prod.weight;
    document.getElementById("sheetWhat").textContent = prod.what;
    fillList("sheetInside", prod.inside);
    fillList("sheetMade", prod.made);
    fillList("sheetUse", prod.use);
    var dataEl = document.getElementById("sheetData");
    dataEl.innerHTML = "";
    prod.data.forEach(function (pair) {
      var div = document.createElement("div");
      var dt = document.createElement("dt"); dt.textContent = pair[0];
      var dd = document.createElement("dd"); dd.textContent = pair[1];
      div.appendChild(dt); div.appendChild(dd); dataEl.appendChild(div);
    });
    sheetAdd.textContent = "Add " + prod.name + " to basket, " + prod.price;
    sheet.hidden = false;
    if (scrim) { scrim.hidden = false; }
    sheet.querySelector(".sheet-scroll").scrollTop = 0;
    var opened = false;
    function markOpen() {
      if (opened) return;
      opened = true;
      sheet.classList.add("open");
      sheet.setAttribute("aria-hidden", "false");
      if (scrim) scrim.classList.add("show");
    }
    requestAnimationFrame(function () { requestAnimationFrame(markOpen); });
    setTimeout(markOpen, 70);
    if (sheetClose) sheetClose.focus({ preventScroll: true });
  }
  function closeSheet() {
    if (!sheet || sheet.hidden) return;
    sheet.classList.remove("open");
    sheet.setAttribute("aria-hidden", "true");
    if (scrim) scrim.classList.remove("show");
    setTimeout(function () {
      sheet.hidden = true;
      if (scrim) scrim.hidden = true;
    }, reducedMotion ? 0 : 460);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  document.querySelectorAll("[data-detail]").forEach(function (btn) {
    btn.addEventListener("click", function (ev) {
      ev.stopPropagation();
      openSheet(btn.getAttribute("data-detail"));
    });
  });
  document.querySelectorAll(".card[data-product]").forEach(function (card) {
    card.addEventListener("click", function (ev) {
      if (ev.target.closest && ev.target.closest("button")) return;
      openSheet(card.getAttribute("data-product"));
    });
  });
  if (sheetClose) sheetClose.addEventListener("click", closeSheet);
  if (scrim) scrim.addEventListener("click", closeSheet);
  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape") closeSheet();
  });
  if (sheetAdd) {
    sheetAdd.addEventListener("click", function () {
      if (!currentProduct) return;
      var name = currentProduct.name;
      showToast("Added " + name + " to your basket");
      sheetAdd.classList.remove("pulse");
      void sheetAdd.offsetWidth;
      sheetAdd.classList.add("pulse");
      var amt = currentProduct.priceNum || 0;
      var img = document.getElementById("sheetImg");
      if (img && cartBtn && !reducedMotion && typeof img.animate === "function") {
        flyToBasket(img, function () { bumpCount(amt); });
      } else {
        bumpCount(amt);
      }
    });
  }

})();
