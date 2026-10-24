(function () {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = window.matchMedia("(pointer: fine)").matches;

  const PHOENIX = document.getElementById("phoenixCopy")
    ? document.getElementById("phoenixCopy").textContent
    : "";

  function pad(n) { return String(n).padStart(3, "0"); }
  function pad2(n) { return String(n).padStart(2, "0"); }

  /* Scroll frames */
  const steps = document.querySelectorAll(".step[data-show]");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = entry.target.dataset.show;
        const scene = entry.target.closest(".scene");
        if (!scene) return;
        scene.querySelectorAll(".frame").forEach((f) => f.classList.toggle("on", f.dataset.frame === id));
      });
    }, { rootMargin: "-42% 0px -42% 0px", threshold: 0 });
    steps.forEach((s) => io.observe(s));

    const clips = document.querySelectorAll(".clip");
    const cio = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("in"); });
    }, { threshold: 0.4 });
    clips.forEach((c) => cio.observe(c));

    const railLinks = [...document.querySelectorAll(".rail a")];
    const sections = railLinks.map((a) => document.querySelector(a.getAttribute("href"))).filter(Boolean);
    const rio = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const id = "#" + e.target.id;
        railLinks.forEach((a) => a.classList.toggle("on", a.getAttribute("href") === id));
      });
    }, { rootMargin: "-40% 0px -50% 0px", threshold: 0 });
    sections.forEach((s) => rio.observe(s));
  } else {
    document.querySelectorAll(".frame").forEach((f) => f.classList.add("on"));
    document.querySelectorAll(".clip").forEach((c) => c.classList.add("in"));
  }

  /* Pack rip */
  const rip = document.getElementById("hook");
  const lines = [...document.querySelectorAll(".hook-line")];
  function paintRip() {
    if (!rip || reduced) {
      lines.forEach((l) => l.classList.add("on"));
      return;
    }
    const rect = rip.getBoundingClientRect();
    const total = rip.offsetHeight - window.innerHeight;
    const scrolled = Math.min(Math.max(-rect.top, 0), Math.max(total, 1));
    const p = total > 0 ? scrolled / total : 1;
    rip.style.setProperty("--rip", p.toFixed(3));
    const marks = [0.08, 0.28, 0.48, 0.66];
    lines.forEach((l, i) => l.classList.toggle("on", p >= marks[i]));
  }
  let ripQueued = false;
  function onScroll() {
    if (ripQueued) return;
    ripQueued = true;
    requestAnimationFrame(() => { ripQueued = false; paintRip(); paintTimeline(); });
  }
  paintRip();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* Compare sliders */
  document.querySelectorAll(".compare input").forEach((input) => {
    input.addEventListener("input", () => {
      const box = input.closest(".compare");
      const pair = box.dataset.pair;
      const v = input.value;
      document.querySelectorAll('.compare[data-pair="' + pair + '"]').forEach((c) => {
        c.style.setProperty("--pos", v + "%");
        const other = c.querySelector("input");
        if (other && other !== input) other.value = v;
      });
    });
  });

  /* Pack covers */
  const packNames = { venom: "Venom", magneto: "Magneto", cyclops: "Cyclops", wolverine: "Wolverine" };
  const picker = document.getElementById("packPicker");
  if (picker) {
    picker.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-pack]");
      if (!b) return;
      const name = b.dataset.pack;
      document.querySelectorAll("[data-pack-view]").forEach((img) => {
        img.src = "/94flair/images/print-fx/hd/pack-" + name + ".jpg";
        img.alt = packNames[name] + " cover of a 1994 Flair pack";
      });
      picker.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
    });
  }

  /* Three stages */
  const stages = {
    color: ["/94flair/images/print-fx/hd/ma138-sm2099-color.jpg", "Printed comic · Spider-Man 2099 #6"],
    bw: ["/94flair/images/print-fx/hd/ma138-sm2099-bw.jpg", "Black-and-white copy given to McGrew"],
    flair: ["/94flair/images/print-fx/hd/ma138-sm2099-flair.jpg", "Computer-enhanced version in the article"]
  };
  const stageTools = document.getElementById("stageTools");
  const stageCap = document.getElementById("stageCap");
  if (stageTools) {
    stageTools.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-stage]");
      if (!b) return;
      const spec = stages[b.dataset.stage];
      document.querySelectorAll(".scrub-view").forEach((img) => { img.src = spec[0]; img.alt = spec[1]; });
      if (stageCap) stageCap.textContent = spec[1];
      stageTools.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
    });
  }

  /* Chase tilt */
  bindTilt(document.getElementById("chaseTilt"), document.getElementById("chaseFlip"));
  const chaseBtn = document.getElementById("chaseFlipBtn");
  const chaseFlip = document.getElementById("chaseFlip");
  if (chaseBtn && chaseFlip) {
    chaseBtn.addEventListener("click", () => flipEl(chaseFlip));
  }

  /* Flairprints */
  const PRINTS = [
    ["01", "Cable", "Powerblast #1. X-Men (1991) #25, Cable hologram. Greg Capullo."],
    ["02", "Cyclops", "Powerblast #2. X-Men team pin-up. Joe Quesada."],
    ["03", "Ghost Rider", "Powerblast #9. Sleepwalker (1991) #11, page 6. Bret Blevins."],
    ["04", "Iron Man", "Powerblast #3. Iron Man (1968) #301 cover. Kevin Hopgood."],
    ["05", "Magneto", "Powerblast #4. Uncanny X-Men #269, page 22. Jim Lee."],
    ["06", "Phoenix", "Powerblast #5 art, enlarged. The source is the open case in the unsolved files."],
    ["07", "Punisher", "Powerblast #10. Punisher: War Journal #42 cover. The checklist names no artist."],
    ["08", "Storm", "Powerblast #6. 1992 Impel Marvel Universe, Storm, #30. Lee Weeks."],
    ["09", "Venom", "Powerblast #7. Venom: Lethal Protector #2. Mark Bagley."],
    ["10", "Wolverine", "Powerblast #8. Wolverine (1988) #67 cover. Mark Texeira."]
  ];
  const printImg = document.getElementById("printImg");
  const printCap = document.getElementById("printCap");
  const printRow = document.getElementById("printRow");
  if (printRow) {
    PRINTS.forEach((p, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-pressed", i === 0 ? "true" : "false");
      b.innerHTML = '<img src="/94flair/images/thumbs/flairprint/' + p[0] + '.jpg" alt="' + p[1] + ' Flairprint">';
      b.addEventListener("click", () => {
        printImg.src = "/94flair/images/flairprint-fx/hd/" + p[0] + ".jpg";
        printImg.alt = "Flairprint of " + p[1];
        printCap.innerHTML = "<b>" + p[1] + ".</b> " + p[2];
        printRow.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
      });
      printRow.appendChild(b);
    });
  }

  /* Binders — real scans, insertSrc('binder', n) => 01–05 */
  const BINDERS = [
    ["01", "Captain America", "Powerblast #11 art. Uncanny X-Men #268, page 1. Jim Lee. No logo, no title, no metallic finish."],
    ["02", "Gambit", "Powerblast #12 art. X-Men Annual (1992) #1, page 41. Andy Kubert. No logo, no title, no metallic finish."],
    ["03", "Thor", "Powerblast #13 art. Thor (1966) #400, page 36. Ron Frenz. No logo, no title, no metallic finish."],
    ["04", "Silver Surfer", "Powerblast #14 art. Silver Surfer (1987) #31 cover, flipped. Artist unknown. No logo, no title, no metallic finish."],
    ["05", "Spider-Man", "Powerblast #15 art. Amazing Spider-Man #322, page 8. Todd McFarlane. This insert was verified in a sealed 1995 Fleer Ultra X-Men binder. No logo, no title, no metallic finish."]
  ];
  const binderImg = document.getElementById("binderImg");
  const binderCap = document.getElementById("binderCap");
  const binderRow = document.getElementById("binderRow");
  const binderBack = document.getElementById("binderBack");
  const binderView = document.getElementById("binderView");
  let binderIndex = 0;
  let showingBack = false;
  function showBinder(i) {
    binderIndex = i;
    showingBack = false;
    const b = BINDERS[i];
    binderView.innerHTML = '<img id="binderImg" src="/94flair/images/binder-fx/hd/' + b[0] + '.jpg" alt="Binder insert of ' + b[1] + '" width="907" height="1400">';
    binderCap.innerHTML = "<b>" + b[1] + ".</b> " + b[2];
    if (binderBack) binderBack.textContent = "Show the blank back";
    binderRow.querySelectorAll("button").forEach((x, n) => x.setAttribute("aria-pressed", n === i ? "true" : "false"));
  }
  if (binderRow) {
    BINDERS.forEach((b, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("aria-pressed", i === 0 ? "true" : "false");
      btn.innerHTML = '<img src="/94flair/images/thumbs/binder/' + b[0] + '.jpg" alt="' + b[1] + ' binder insert">';
      btn.addEventListener("click", () => showBinder(i));
      binderRow.appendChild(btn);
    });
  }
  if (binderBack) {
    binderBack.addEventListener("click", () => {
      const b = BINDERS[binderIndex];
      if (!showingBack) {
        binderView.innerHTML = '<div class="blank-back" role="img" aria-label="Blank back of the ' + b[1] + ' binder insert"><div>Back<br>completely blank</div></div>';
        binderBack.textContent = "Show the scan";
        showingBack = true;
      } else {
        showBinder(binderIndex);
      }
    });
  }

  /* Lightbox */
  const pop = document.getElementById("pop");
  const popImg = document.getElementById("popImg");
  const popCap = document.getElementById("popCap");
  function openPop(src, alt, cap) {
    popImg.src = src;
    popImg.alt = alt || "";
    popCap.textContent = cap || "";
    if (typeof pop.showModal === "function") pop.showModal();
  }
  document.body.addEventListener("click", (e) => {
    const b = e.target.closest("[data-full]");
    if (!b || !pop) return;
    openPop(b.dataset.full, b.dataset.cap || "", b.dataset.cap || "");
  });

  /* Names for sheet cells */
  const NAME = ["","The Thing","The Incredible Hulk","With Great Power...","God of Thunder","Spider-Man","Iron Man","Hulk vs. Thing","Vulture vs. Spider-Man","Dr. Octopus","Xavier","Avengers","Dr. Strange","Quicksilver","Man Without Fear","Scorpion vs. Spider-Man","Captain America","Daredevil vs. Submariner","Invisible Woman","Sentinel","The Coming of Galactus","The Power Cosmic","Spider-Man vs. Green Goblin","Rhino vs. Spider-Man","Mary Jane","Dr. Doom","Warlock","Behold the Vision","Mephisto","Morbius","The Original Ghost Rider","Thanos","Death of Gwen Stacy","The Punisher","Wolverine vs. Hulk","The Scarlet Witch","Invaders","The Black Cat","White Queen","She-Hulk","Moon Knight","Days of Future Past","Elektra","Death of Elektra","Hobgoblin","Northstar","Beta Ray Bill","The Trial of Mr. Fantastic","The Black Costume","Puma vs. Spidey","Silver Sable Inc.","Iceman","Apocalypse Now","Deadly Enemies","Nightcrawler","Creation of Archangel","Mr. Sinister","The Wedding","Jubilee","Armor Wars","Tombstone","Venom","Typhoid Mary","Mr. Fix-It","Speedball","Cap vs. Cap","Quasar","Cosmic Spider-Man","Nomad","Thanos","Bodyslide","New Ghost Rider","Creation of Deathlok","The New Nova","Cable vs. Wolverine","Gambit","X-tinction Agenda","The New Hulk","Deadpool","Shatterstar","X-Force","Johnny Blaze","Child of the Future","X-Factor","Blue & Gold","Bishop","Omega Red vs. Wolverine","Punisher vs. The Mob","Carnage","Cage","War Machine","Death of Mariko","Spider Slayers","Nightstalkers","Spider-Man 2099","Hulk Leads the Pantheon","Stryfe","Mirror Images","Wonder Man","Doom 2099","Lethal Protector","Punisher 2099","Green Goblin","Alternate Visions","Maximum Carnage","Namor","Random","Psylocke","Psi-Lord","Thunderstrike","Infinity Crusade","Hulk 2099","Cable Returns","The Death of Illyana","Gambit & Rogue","Vengeance","Daredevil","The New Ravage","Wolverine Defeated","Bone Claws","Magneto Returns","Xavier vs. Magneto","Colossus Defects","Exodus","Bloodhawk","Zarathos","Final Conflict","Centurious","The Thor Corps","Sabretooth Surrenders","Venom: The Madness","Strange","Suicide Run","Legacy","Justice","Carnage","Venom","Spider-Demon","Shriek","Spider-Man","Venom Lives","Cyclops","Jean Grey","Bishop","Warpath","Rogue","Domino","Boom Boom","Wolverine","Havok","Checklist"];

  function cardPop(n, extra) {
    const name = NAME[n] || ("Card " + n);
    openPop("/94flair/images/cards-fx/hd/" + pad(n) + ".jpg", "Flair card " + n + ", " + name, "#" + n + " " + name + (extra ? ". " + extra : ""));
  }

  /* 4-card sheet. File order verified against the printed titles. */
  const FOUR = [
    { id: "foil", label: "Foil etched", src: "/94flair/images/promo-fx/hd/sheet4-foil.jpg", alt: "Foil-etched 4-card sheet, Ships June 1994",
      note: "Reported as the Wizard #35 insert. Front: title card, Bone Claws, Phoenix, Maximum Carnage.",
      cells: [
        { title: "Title card", text: "Ships June 1994, white letters etched in gold foil. Not a character card." },
        { n: 119 },
        { pb: 5 },
        { n: 104 }
      ] },
    { id: "sticker", label: "Gold sticker", src: "/94flair/images/promo-fx/hd/sheet4-sticker.jpg", alt: "4-card sheet with the Ships June 1994 gold sticker",
      note: "Same lineup. The date is black text on a gold paste-on sticker.",
      cells: [
        { title: "Title card", text: "Ships June 1994, black text on a gold paste-on sticker." },
        { n: 119 }, { pb: 5 }, { n: 104 }
      ] },
    { id: "ultimate", label: "Ultimate", src: "/94flair/images/promo-fx/hd/sheet4-ultimate.jpg", alt: "4-card sheet titled The Ultimate Collectable",
      note: "Released front. The title card reads The Ultimate Collectable.",
      cells: [
        { title: "Title card", text: "The Ultimate Collectable. Same four-card lineup." },
        { n: 119 }, { pb: 5 }, { n: 104 }
      ] },
    { id: "back", label: "Released back", src: "/94flair/images/promo-fx/hd/sheet4-released-back.jpg", alt: "Back of a released 4-card sheet",
      note: "Bodyslide, Spider-Man 2099, Thunderstrike, New Ghost Rider.",
      cells: [ { n: 70 }, { n: 94 }, { n: 109 }, { n: 71 } ] },
    { id: "unreleased", label: "Unreleased", src: "/94flair/images/promo-fx/hd/sheet4-unreleased.jpg", alt: "Unreleased 4-card sheet",
      note: "Never shipped. Gambit & Rogue, Infinity Crusade, Maximum Carnage, Bone Claws. The back’s fourth bullet says “presents” instead of “present.”",
      cells: [ { n: 114 }, { n: 110 }, { n: 104 }, { n: 119 } ] }
  ];
  const fourNav = document.getElementById("fourNav");
  const fourImg = document.getElementById("fourImg");
  const fourHots = document.getElementById("fourHots");
  const fourNote = document.getElementById("fourNote");
  const fourStage = document.getElementById("fourStage");
  function renderFour(spec) {
    fourImg.src = spec.src;
    fourImg.alt = spec.alt;
    fourNote.textContent = spec.note;
    fourHots.innerHTML = "";
    spec.cells.forEach((cell) => {
      const b = document.createElement("button");
      b.type = "button";
      if (cell.title) {
        b.setAttribute("aria-label", cell.title);
        b.addEventListener("click", () => openPop(spec.src, spec.alt, cell.text));
      } else if (cell.pb) {
        b.setAttribute("aria-label", "Powerblast 5 Phoenix");
        b.addEventListener("click", () => openPop(
          "/94flair/images/powerblast-fx/hd/05.jpg",
          "Powerblast 5 Phoenix",
          "Powerblast #5 Phoenix, as it appears on the sheet. The source is an open case. See the unsolved files."
        ));
      } else {
        b.setAttribute("aria-label", "Card " + cell.n + " " + NAME[cell.n]);
        b.addEventListener("click", () => cardPop(cell.n));
      }
      fourHots.appendChild(b);
    });
    fourNav.querySelectorAll("button[data-four]").forEach((x) => x.setAttribute("aria-pressed", x.dataset.four === spec.id ? "true" : "false"));
  }
  if (fourNav) {
    FOUR.forEach((spec) => {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.four = spec.id;
      b.textContent = spec.label;
      b.setAttribute("aria-pressed", spec.id === "foil" ? "true" : "false");
      b.addEventListener("click", () => renderFour(spec));
      fourNav.appendChild(b);
    });
    const zoom = document.createElement("button");
    zoom.type = "button";
    zoom.textContent = "Zoom";
    zoom.addEventListener("click", () => {
      const on = fourStage.classList.toggle("is-zoomed");
      zoom.setAttribute("aria-pressed", on ? "true" : "false");
    });
    fourNav.appendChild(zoom);
    renderFour(FOUR[0]);
  }

  /* 9-card sheets. File index verified against the printed top-left title, then a second cell. */
  const NINES = [
    { file: 1, label: "Black Costume", cells: [[48, 84, 98], [131, 11, 145], [130, 36, 143]] },
    { file: 2, label: "Photographed", photo: true, cells: [[92, 30, 56], [93, 33, 59], [87, 15, 133]] },
    { file: 3, label: "Venom Madness", cells: [[130, 36, 143], [127, 83, 146], [78, 112, 117]] },
    { file: 4, label: "Deadpool", star: 145, cells: [[78, 112, 117], [48, 84, 98], [131, 11, 145]] },
    { file: 5, label: "Mr. Fix-It", cells: [[63, 109, 49], [69, 104, 52], [70, 111, 53]] },
    { file: 6, label: "War Machine", cells: [[90, 16, 129], [94, 29, 55], [92, 30, 56]] },
    { file: 7, label: "Thanos", cells: [[69, 104, 52], [70, 111, 53], [71, 118, 46]] },
    { file: 8, label: "Ghost Rider", cells: [[71, 118, 46], [77, 119, 50], [63, 109, 49]] },
    { file: 9, label: "Punisher", cells: [[87, 15, 133], [90, 16, 129], [94, 29, 55]] }
  ];
  const nineNav = document.getElementById("nineNav");
  const nineImg = document.getElementById("nineImg");
  const nineHots = document.getElementById("nineHots");
  const nineNote = document.getElementById("nineNote");
  const nineStage = document.getElementById("nineStage");
  function renderNine(spec) {
    nineImg.src = "/94flair/images/promo-fx/hd/sheet9-" + spec.file + ".jpg";
    nineImg.alt = (spec.photo ? "Photographed 9-card press sheet, " : "9-card press sheet, ") + spec.label + " row";
    const flat = spec.cells.flat();
    nineNote.textContent = (spec.photo ? "Photographed sheet (sheet9-2.jpg). " : "Press sheet file " + spec.file + ". ") +
      "Left to right, top to bottom: " + flat.map((n) => "#" + n + (spec.star === n ? "*" : "") + " " + NAME[n]).join(", ") + ".";
    nineHots.innerHTML = "";
    flat.forEach((n) => {
      const b = document.createElement("button");
      b.type = "button";
      const star = spec.star === n ? " The checklist marks this one with an asterisk: unnumbered on that sheet." : "";
      b.setAttribute("aria-label", "Card " + n + " " + NAME[n]);
      b.addEventListener("click", () => cardPop(n, star));
      nineHots.appendChild(b);
    });
    nineNav.querySelectorAll("button[data-nine]").forEach((x) => x.setAttribute("aria-pressed", Number(x.dataset.nine) === spec.file ? "true" : "false"));
  }
  if (nineNav) {
    NINES.forEach((spec) => {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.nine = String(spec.file);
      b.textContent = spec.photo ? "Photo" : spec.label;
      b.setAttribute("aria-pressed", spec.file === 2 ? "true" : "false");
      b.addEventListener("click", () => renderNine(spec));
      nineNav.appendChild(b);
    });
    const zoom = document.createElement("button");
    zoom.type = "button";
    zoom.textContent = "Zoom";
    zoom.addEventListener("click", () => {
      const on = nineStage.classList.toggle("is-zoomed");
      zoom.setAttribute("aria-pressed", on ? "true" : "false");
    });
    nineNav.appendChild(zoom);
    renderNine(NINES[1]);
  }

  /* Magazine and comic racks */
  const AD_MAGS = [
    ["ma1", "Tuff Stuff’s Collect!", "May 1994. Glossy Inaugural Edition ad."],
    ["ma2", "Tuff Stuff’s Collect!", "July 1994. Glossy ad and the Introducing FlairPrints ad."],
    ["ma3", "Cards Illustrated #7", "July 1994. Glossy Inaugural Edition ad."],
    ["ma4", "Hero Illustrated #13", "July 1994. Introducing FlairPrints, Ghost Rider."],
    ["ma5", "Collector’s Sportslook", "August 1994. Glossy Inaugural Edition ad."],
    ["ma6", "Collect! Star Trek", "August 1994. Glossy Inaugural Edition ad."]
  ];
  const COMICS = [
    ["ad1", "Fantastic Four #388", "May 1994. Earliest indexed comic ad."],
    ["ad2", "Fantastic Four Unlimited #6", "June 1994."],
    ["ad3", "Amazing Spider-Man #390", "June 1994."],
    ["ad4", "The Punisher #91", "June 1994."],
    ["ad5", "Fantastic Four Annual #27", "1994. Month not on the checklist."],
    ["ad6", "Spectacular Spider-Man #214", "July 1994."],
    ["ad7", "X-Men #33", "1994. Month not on the checklist."],
    ["ad8", "X-Factor #103", "1994. Month not on the checklist."],
    ["ad9", "X-Men Adventures #5", "1994. Month not on the checklist."],
    ["ad10", "Blackwulf #2", "1994. Month not on the checklist."],
    ["ad11", "Northstar #3", "1994. Month not on the checklist."],
    ["ad12", "Excalibur #78", "September 1994."]
  ];
  function fillRack(id, rows) {
    const host = document.getElementById(id);
    if (!host) return;
    rows.forEach((r) => {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.full = "/94flair/images/print-fx/hd/" + r[0] + ".jpg";
      b.dataset.cap = r[1] + ". " + r[2];
      b.innerHTML = '<img src="/94flair/images/thumbs/print/' + r[0] + '.jpg" alt=""><span>' + r[1] + "</span>";
      host.appendChild(b);
    });
  }
  fillRack("adMags", AD_MAGS);
  fillRack("comicAds", COMICS);

  /* Timeline */
  const tl = document.getElementById("timelineList");
  const tlItems = tl ? [...tl.querySelectorAll(".t-item")] : [];
  function paintTimeline() {
    if (!tl) return;
    const rect = tl.getBoundingClientRect();
    const total = tl.offsetHeight;
    const seen = Math.min(Math.max(window.innerHeight * 0.45 - rect.top, 0), total);
    const pct = total ? (seen / total) * 100 : 0;
    tl.style.setProperty("--fill", pct.toFixed(1) + "%");
    let current = tlItems[0];
    tlItems.forEach((item) => {
      const r = item.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.55) current = item;
    });
    tlItems.forEach((item) => item.classList.toggle("on", item === current));
  }
  paintTimeline();

  /* Studio */
  const DECK = [
    { id: "001", kind: "card", name: "The Thing", meta: "Base #1 · Origin of the Fantastic Four!",
      lore: "Fantastic Four Unlimited (1993) #1 cover. Pencils by Mark Pacella, inks by Brad Vancata.", source: true },
    { id: "034", kind: "card", name: "Wolverine vs. Hulk", meta: "Base #34",
      lore: "The Incredible Hulk (1968) #340 cover. Todd McFarlane.", source: true },
    { id: "043", kind: "card", name: "Death of Elektra", meta: "Base #43",
      lore: "Daredevil #182 cover. Frank Miller.", source: true },
    { id: "058", kind: "card", name: "Jubilee", meta: "Base #58 · The Origin of Jubilee",
      lore: "Uncanny X-Men #258, page 9, panel 1. Jim Lee pencils, Scott Williams inks. Cropped, recolored, fireworks added. Not flipped.", source: true },
    { id: "057", kind: "card", name: "The Wedding", meta: "Base #57",
      lore: "John Romita Sr., inks by John Romita Jr. Heart backdrop replaced with a city. Web of Spider-Man Annual #4 is likely, not verified.", source: true },
    { id: "010", kind: "card", name: "Xavier", meta: "Base #10",
      lore: "Ron Lim’s in-house sketches, also used on 1994 X-Men playing cards, a 1995 counter standee, and 1996 magnets.", source: true },
    { id: "044", kind: "card", name: "Hobgoblin", meta: "Base #44",
      lore: "Crop of Marvel’s 1987 five-foot Hobgoblin store display. Artist unknown.", source: true },
    { id: "085", kind: "card", name: "Bishop", meta: "Base #85",
      lore: "1993 Comic Images T-shirt MVS868. Artist unknown.", source: true },
    { id: "078", kind: "card", name: "Deadpool", meta: "Base #78",
      lore: "Circle Chase #2, page 5, Joe Madureira. A loose repaint: pose matches, head and gun arm do not. The back cites New Mutants #98 as the story, not the art source.", source: true },
    { id: "037", kind: "card", name: "The Black Cat", meta: "Base #37 · unsolved",
      lore: "Unsolved. The leading theory, from the Marvel Age account of in-house art, is unpublished in-house inks. That is a theory. No source image is on file.", source: false },
    { id: "05", kind: "pb", name: "Phoenix", meta: "Powerblast #5",
      lore: PHOENIX, source: true, sourceId: "pb05" },
    { id: "14", kind: "pb", name: "Silver Surfer", meta: "Powerblast #14",
      lore: "Silver Surfer (1987) #31 cover, flipped horizontally. Artist unknown.", source: true, sourceId: "pb14" }
  ];
  let index = 0;
  let flipped = false;
  const flipper = document.getElementById("flipper");
  const tilt = document.getElementById("tilt");
  const front = document.getElementById("cardFront");
  const back = document.getElementById("cardBack");
  const loreMeta = document.getElementById("loreMeta");
  const loreName = document.getElementById("loreName");
  const loreText = document.getElementById("loreText");
  const live = document.getElementById("cardLive");
  const pile = document.getElementById("pile");
  const studioCompare = document.getElementById("studioCompare");
  const srcUnder = document.getElementById("srcUnder");
  const srcOver = document.getElementById("srcOver");

  function paths(card) {
    if (card.kind === "pb") {
      return {
        front: "/94flair/images/powerblast-fx/hd/" + card.id + ".jpg",
        back: "/94flair/images/powerblast-backs-fx/hd/" + card.id + ".jpg",
        source: "/94flair/images/sources-fx/hd/" + card.sourceId + "-comic.jpg"
      };
    }
    return {
      front: "/94flair/images/cards-fx/hd/" + card.id + ".jpg",
      back: "/94flair/images/backs-fx/hd/" + card.id + ".jpg",
      source: "/94flair/images/sources-fx/hd/" + card.id + "-comic.jpg"
    };
  }
  function showCard(i) {
    index = (i + DECK.length) % DECK.length;
    const card = DECK[index];
    const p = paths(card);
    flipped = false;
    if (flipper) {
      flipper.style.setProperty("--flip", "0deg");
      flipper.classList.remove("show-back");
    }
    front.src = p.front;
    front.alt = card.meta + ", " + card.name;
    back.src = p.back;
    back.alt = "Back of " + card.name;
    loreMeta.textContent = card.meta;
    loreName.textContent = card.name;
    loreText.textContent = card.lore;
    if (live) live.textContent = card.meta + ". " + card.name;
    if (studioCompare) {
      studioCompare.hidden = !card.source;
      if (card.source) {
        srcUnder.src = p.source;
        srcUnder.alt = "Source art for " + card.name;
        srcOver.src = p.front;
        srcOver.alt = "Flair card, " + card.name;
      }
    }
    if (pile) {
      pile.querySelectorAll("button").forEach((b, n) => b.setAttribute("aria-current", n === index ? "true" : "false"));
    }
  }
  function flipEl(el) {
    const on = el.style.getPropertyValue("--flip") === "180deg";
    el.style.setProperty("--flip", on ? "0deg" : "180deg");
    el.classList.toggle("show-back", !on);
    return !on;
  }
  function flipStudio() {
    if (!flipper) return;
    flipped = flipEl(flipper);
  }
  if (pile) {
    DECK.forEach((card, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.style.setProperty("--r", ((i % 5) - 2) * 2 + "deg");
      b.style.setProperty("--sx", ((i % 4) - 1.5) * 28 + "px");
      b.style.setProperty("--sy", ((i % 3) - 1) * 18 + "px");
      const thumb = card.kind === "pb"
        ? "/94flair/images/thumbs/powerblast/" + card.id + ".jpg"
        : "/94flair/images/thumbs/cards/" + card.id + ".jpg";
      b.innerHTML = '<img src="' + thumb + '" alt="' + card.name + '">';
      b.addEventListener("click", () => { pile.classList.remove("scattered"); showCard(i); });
      pile.appendChild(b);
    });
    showCard(0);
  }
  const prev = document.getElementById("prevCard");
  const next = document.getElementById("nextCard");
  const flipBtn = document.getElementById("flipCard");
  if (prev) prev.addEventListener("click", () => showCard(index - 1));
  if (next) next.addEventListener("click", () => showCard(index + 1));
  if (flipBtn) flipBtn.addEventListener("click", flipStudio);

  bindTilt(tilt, flipper);
  if (tilt) {
    let startX = 0, startY = 0, tracking = false;
    tilt.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button, input, a")) return;
      tracking = true;
      startX = e.clientX;
      startY = e.clientY;
    });
    tilt.addEventListener("pointerup", (e) => {
      if (!tracking) return;
      tracking = false;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) showCard(index + (dx < 0 ? 1 : -1));
      else if (Math.abs(dx) < 12 && Math.abs(dy) < 12) flipStudio();
    });
    tilt.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") { e.preventDefault(); showCard(index + 1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); showCard(index - 1); }
      else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flipStudio(); }
      else if (e.key === "s" || e.key === "S") { e.preventDefault(); toggleScatter(); }
      else if (e.key === "Escape") { flipper.style.setProperty("--flip", "0deg"); flipper.classList.remove("show-back"); flipped = false; }
    });
  }
  const scatterBtn = document.getElementById("scatterBtn");
  function toggleScatter() {
    if (!pile) return;
    const on = pile.classList.toggle("scattered");
    if (scatterBtn) scatterBtn.setAttribute("aria-pressed", on ? "true" : "false");
  }
  if (scatterBtn) scatterBtn.addEventListener("click", toggleScatter);

  const gyroBtn = document.getElementById("gyroBtn");
  let gyroOn = false;
  function onOrient(e) {
    if (!gyroOn || !flipper || reduced) return;
    const rx = Math.max(-12, Math.min(12, (e.beta || 0) / 6));
    const ry = Math.max(-14, Math.min(14, (e.gamma || 0) / 5));
    flipper.style.setProperty("--rx", rx + "deg");
    flipper.style.setProperty("--ry", ry + "deg");
    const holo = flipper.querySelector(".holo");
    if (holo) holo.style.setProperty("--holo", "0.45");
  }
  if (gyroBtn) {
    gyroBtn.addEventListener("click", async () => {
      const DOE = window.DeviceOrientationEvent;
      if (DOE && typeof DOE.requestPermission === "function") {
        try {
          const state = await DOE.requestPermission();
          if (state !== "granted") return;
        } catch (err) { return; }
      }
      gyroOn = !gyroOn;
      gyroBtn.setAttribute("aria-pressed", gyroOn ? "true" : "false");
      gyroBtn.textContent = gyroOn ? "Tilt on" : "Phone tilt";
      if (gyroOn) window.addEventListener("deviceorientation", onOrient);
      else window.removeEventListener("deviceorientation", onOrient);
    });
  }

  function bindTilt(box, card) {
    if (!box || !card || reduced || !fine) return;
    box.addEventListener("pointermove", (e) => {
      if (gyroOn && box.id === "tilt") return;
      const r = box.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      card.style.setProperty("--ry", ((x - 0.5) * 16).toFixed(2) + "deg");
      card.style.setProperty("--rx", ((0.5 - y) * 12).toFixed(2) + "deg");
      const holo = card.querySelector(".holo");
      if (holo) {
        holo.style.setProperty("--holo", "0.55");
        holo.style.setProperty("--ang", (100 + x * 40).toFixed(0) + "deg");
      }
    });
    box.addEventListener("pointerleave", () => {
      if (gyroOn && box.id === "tilt") return;
      card.style.setProperty("--rx", "0deg");
      card.style.setProperty("--ry", "0deg");
      const holo = card.querySelector(".holo");
      if (holo) holo.style.setProperty("--holo", "0");
    });
  }

  /* Scattered pile motion */
  const style = document.createElement("style");
  style.textContent = ".pile.scattered button{transform:translate(var(--sx),var(--sy)) rotate(var(--r));} .flipper.show-back{aspect-ratio:1200/857;}";
  document.head.appendChild(style);
})();
