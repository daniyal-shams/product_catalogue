const brandName = "Epic & Flair";
const whatsappNumber = "919876543210";
const catalogueUrl = new URL("data/catalogue.json", document.baseURI);
const deck = document.querySelector("#deck");
const productSlides = document.querySelector("#product-slides");
const loadError = document.querySelector("#load-error");
const toast = document.querySelector("#toast");
const menuToggle = document.querySelector("#menu-toggle");
const mainNav = document.querySelector(".main-nav");
const indicators = document.querySelector("#slide-indicators");
let toastTimeout;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

async function loadJson(url) {
  const response = await fetch(url, { cache: "reload" });
  if (!response.ok) {
    throw new Error(`Could not load ${url.pathname}: HTTP ${response.status}`);
  }
  return response.json();
}

function validateProduct(product, url, category) {
  const requiredText = [
    "name",
    "color",
    "colorHex",
    "headingLead",
    "headingAccent",
    "intro",
    "price",
    "description",
    "image",
    "imageAlt",
    "selectedSize",
  ];

  if (!product || typeof product !== "object" || Array.isArray(product)) {
    throw new Error(`${url.pathname} must contain a JSON object.`);
  }

  for (const key of requiredText) {
    if (typeof product[key] !== "string" || product[key].trim() === "") {
      throw new Error(`${url.pathname} is missing the required "${key}" text.`);
    }
  }

  if (!/^#[\da-f]{6}$/i.test(product.colorHex)) {
    throw new Error(`${url.pathname} has an invalid colorHex value.`);
  }

  if (!Array.isArray(product.sizes) || product.sizes.length === 0 || !product.sizes.every((size) => typeof size === "string")) {
    throw new Error(`${url.pathname} must contain a non-empty sizes array of strings.`);
  }

  if (!product.sizes.includes(product.selectedSize)) {
    throw new Error(`${url.pathname} selectedSize must match an available size.`);
  }

  if (!Array.isArray(product.specs) || product.specs.length === 0) {
    throw new Error(`${url.pathname} must contain at least one product spec.`);
  }

  for (const [index, spec] of product.specs.entries()) {
    if (!spec || ["icon", "label", "value", "note"].some((key) => typeof spec[key] !== "string")) {
      throw new Error(`${url.pathname} spec ${index + 1} must include icon, label, value, and note strings.`);
    }
  }

  if (category === "pant") {
    for (const key of ["details", "care"]) {
      if (!Array.isArray(product[key]) || product[key].length === 0 || !product[key].every((item) => typeof item === "string")) {
        throw new Error(`${url.pathname} must contain a non-empty ${key} array of strings.`);
      }
    }
  }

  if (product.imageFilter !== undefined && !/^[\w\s().,%+-]+$/.test(product.imageFilter)) {
    throw new Error(`${url.pathname} has an invalid imageFilter value.`);
  }

  if (product.imageFit !== undefined && !["cover", "contain"].includes(product.imageFit)) {
    throw new Error(`${url.pathname} imageFit must be "cover" or "contain".`);
  }

  const imageUrl = new URL(product.image, url);
  if (!["http:", "https:", "file:"].includes(imageUrl.protocol)) {
    throw new Error(`${url.pathname} image must use a supported URL.`);
  }

  return {
    ...product,
    category,
    imageUrl: imageUrl.href,
  };
}

async function loadCategoryProducts(paths, category, manifestUrl) {
  if (!Array.isArray(paths) || paths.length === 0 || !paths.every((path) => typeof path === "string")) {
    throw new Error(`data/catalogue.json must provide a non-empty ${category} file list.`);
  }

  return Promise.all(paths.map(async (path) => {
    const url = new URL(path, manifestUrl);
    const product = await loadJson(url);
    return validateProduct(product, url, category);
  }));
}

function renderVariantButtons(products, currentIndex, category) {
  return products.map((product, index) => {
    const isCurrent = index === currentIndex;
    return `
      <button
        class="swatch${isCurrent ? " active" : ""}"
        type="button"
        data-variant-index="${index}"
        style="background-color: ${escapeHtml(product.colorHex)}"
        aria-label="${escapeHtml(product.color)} ${escapeHtml(product.name)}"
        aria-pressed="${isCurrent}"
        title="${escapeHtml(product.color)}"
      ></button>`;
  }).join("");
}

function renderProductContent(product, categoryProducts, categoryIndex) {
  const categoryLabel = product.category === "shirt" ? "THE SHIRT" : "THE PANT";
  const categoryIndexLabel = `${String(categoryIndex + 1).padStart(2, "0")} / ${String(categoryProducts.length).padStart(2, "0")}`;
  const imageFitClass = product.imageFit === "contain" ? " product-image-contain" : "";
  const imageFilter = product.imageFilter ? ` style="filter: ${escapeHtml(product.imageFilter)}"` : "";
  const specs = product.specs.map((spec) => `
    <article class="spec-card">
      <span class="spec-icon"><i class="fa-solid ${escapeHtml(spec.icon)}" aria-hidden="true"></i></span>
      <span class="spec-label">${escapeHtml(spec.label)}</span>
      <strong>${escapeHtml(spec.value)}</strong>
      <span>${escapeHtml(spec.note)}</span>
    </article>`).join("");
  const sizes = product.sizes.map((size) => `
    <span${size === product.selectedSize ? ' class="size-selected"' : ""}>${escapeHtml(size)}</span>`).join("");
  const pantDetails = product.category === "pant" ? `
    <div class="chino-bottom product-pant-bottom">
      <div class="chino-specs">
        <span class="detail-label">MADE TO MOVE</span>
        <div class="chino-spec-list">
          ${product.details.map((detail, index) => `<span><b>${String(index + 1).padStart(2, "0")}</b> ${escapeHtml(detail)}</span>`).join("")}
        </div>
      </div>
      <div class="care-guide">
        <span class="detail-label">A LITTLE CARE GOES A LONG WAY</span>
        <div class="care-items">${product.care.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
      </div>
    </div>` : "";
  const enquiryMessage = `Hello ${brandName}, I'm interested in the ${product.name} in ${product.color}. Could you share more details?`;

  return `
        <div class="section-heading">
          <div>
            <span class="eyebrow"><span class="eyebrow-line"></span> ${categoryIndexLabel} / ${categoryLabel}</span>
            <h2 class="section-title" id="${product.category}-title">${escapeHtml(product.headingLead)} <em>${escapeHtml(product.headingAccent)}</em></h2>
          </div>
          <p class="section-intro">${escapeHtml(product.intro)}</p>
        </div>
        <div class="shirt-layout">
          <div class="shirt-visual">
            <div class="image-frame shirt-frame${product.category === "pant" ? " pant-frame" : ""}">
              <img class="shirt-image shirt-image-front${imageFitClass}" src="${escapeHtml(product.imageUrl)}" alt="${escapeHtml(product.imageAlt)}"${imageFilter} loading="lazy" />
              <div class="image-vignette" aria-hidden="true"></div>
              <div class="shade-tag">
                <span class="shade-dot" style="background-color: ${escapeHtml(product.colorHex)}"></span>
                <span><small>SELECTED COLOUR</small><strong>${escapeHtml(product.color)}</strong></span>
              </div>
              <span class="frame-caption">${brandName} / ${escapeHtml(product.name)} / SS25</span>
            </div>
            <div class="spec-row" aria-label="${escapeHtml(product.name)} specifications">${specs}</div>
        </div>
        <div class="shirt-details">
          <div class="product-meta">
            <span class="product-category">${brandName.toUpperCase()} ESSENTIALS</span>
            <span class="product-price">${escapeHtml(product.price)}</span>
          </div>
          <h3 class="product-title">${escapeHtml(product.name)}</h3>
          <p class="product-description">${escapeHtml(product.description)}</p>
          <div class="detail-divider"></div>
          <div class="size-row">
            <span class="detail-label">${product.category === "pant" ? "WAIST" : "SIZE"}</span>
            <div class="size-badges" aria-label="Available sizes">${sizes}</div>
            <button class="size-guide" type="button">Size guide <span aria-hidden="true">↗</span></button>
          </div>
          <div class="color-heading">
            <span class="detail-label">THE COLOUR STUDY</span>
            <span class="color-count">${escapeHtml(product.color)} <b>·</b> ${categoryIndex + 1} of ${categoryProducts.length}</span>
          </div>
          <div class="swatch-grid variant-grid" role="group" aria-label="Choose a ${product.category} colour">${renderVariantButtons(categoryProducts, categoryIndex, product.category)}</div>
          <a class="button button-outline" href="https://wa.me/${whatsappNumber}?text=${encodeURIComponent(enquiryMessage)}" target="_blank" rel="noreferrer">
            <i class="fa-brands fa-whatsapp" aria-hidden="true"></i>
            <span>Enquire about this colour</span>
            <span class="button-arrow" aria-hidden="true">↗</span>
          </a>
          <p class="made-note"><i class="fa-solid fa-circle-check" aria-hidden="true"></i> Thoughtfully made in India</p>
        </div>
      </div>
      ${pantDetails}
    `;
}

function renderProductSlide(product, categoryProducts, slideIndex, slideCount) {
  const categoryHeadingId = `${product.category}-title`;
  return `
    <section class="slide shirt-slide product-slide ${product.category}-product-slide" id="slide-${slideIndex}" data-category="${product.category}" aria-labelledby="${categoryHeadingId}">
      <div class="product-content">${renderProductContent(product, categoryProducts, 0)}</div>
      <span class="slide-number">${String(slideIndex).padStart(2, "0")} <i>—</i> ${String(slideCount).padStart(2, "0")}</span>
    </section>`;
}

function createIndicators(slideLabels) {
  indicators.innerHTML = slideLabels.map((label, index) => `
    <a
      href="#slide-${index + 1}"
      class="indicator${index === 0 ? " active" : ""}"
      aria-label="Go to ${escapeHtml(label)}"
      ${index === 0 ? 'aria-current="page"' : ""}
    ></a>`).join("");
}

function updateNavigation(contactSlideId, slideLabels) {
  document.querySelector('[data-nav="shirt"]').href = "#slide-2";
  document.querySelector('[data-nav="pant"]').href = "#slide-3";
  document.querySelector('[data-nav="visit"]').href = `#${contactSlideId}`;

  document.querySelector("#hero-side-note").textContent =
    `A STUDY IN SIMPLICITY · 01—${String(slideLabels.length).padStart(2, "0")}`;
  document.querySelector(".hero-card.shirt-card").href = "#slide-2";
  document.querySelector(".hero-card.chino-card").href = "#slide-3";
  document.querySelector(".scroll-cue").href = "#slide-2";
  document.querySelector("#contact-slide-number").innerHTML =
    `${String(slideLabels.length).padStart(2, "0")} <i>—</i> ${String(slideLabels.length).padStart(2, "0")}`;
  document.querySelector("#slide-contact").id = contactSlideId;
}

function activateSlide(section, navigationLinks, indicatorLinks) {
  navigationLinks.forEach((link) => {
    const target = link.dataset.nav;
    const isActive = target === "home"
      ? section.id === "slide-1"
      : target === "visit"
        ? section.classList.contains("contact-slide")
        : section.dataset.category === target;
    link.classList.toggle("active", isActive);
  });

  indicatorLinks.forEach((link) => {
    const isActive = link.getAttribute("href") === `#${section.id}`;
    link.classList.toggle("active", isActive);
    if (isActive) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}

async function initializeCatalogue() {
  try {
    const manifest = await loadJson(catalogueUrl);
    if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
      throw new Error("data/catalogue.json must contain a JSON object.");
    }

    const [shirts, pants] = await Promise.all([
      loadCategoryProducts(manifest.shirt, "shirt", catalogueUrl),
      loadCategoryProducts(manifest.pant, "pant", catalogueUrl),
    ]);

    const totalSlides = 4;
    const categoryProducts = { shirt: shirts, pant: pants };
    const productSlidesData = [
      { product: shirts[0], variants: shirts, slideIndex: 2 },
      { product: pants[0], variants: pants, slideIndex: 3 },
    ];

    productSlides.innerHTML = productSlidesData.map((item) =>
      renderProductSlide(item.product, item.variants, item.slideIndex, totalSlides),
    ).join("");

    const contactSlideId = `slide-${totalSlides}`;
    const slideLabels = [
      "The edit",
      "The shirt",
      "The pant",
      "Visit us",
    ];
    updateNavigation(contactSlideId, slideLabels);
    createIndicators(slideLabels);

    productSlides.addEventListener("click", (event) => {
      const variantButton = event.target.closest("button[data-variant-index]");
      if (!variantButton) return;

      const section = variantButton.closest(".product-slide");
      const variants = categoryProducts[section.dataset.category];
      const variantIndex = Number(variantButton.dataset.variantIndex);
      const product = variants[variantIndex];
      if (!product) return;

      section.querySelector(".product-content").innerHTML =
        renderProductContent(product, variants, variantIndex);
    });

    const navigationLinks = [...mainNav.querySelectorAll(".nav-link")];
    const indicatorLinks = [...indicators.querySelectorAll(".indicator")];
    const slideSections = [...deck.querySelectorAll(".slide")];
    const slideObserver = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
        if (visibleEntry) activateSlide(visibleEntry.target, navigationLinks, indicatorLinks);
      },
      { root: deck, threshold: [0.2, 0.45, 0.65] },
    );

    slideSections.forEach((section) => slideObserver.observe(section));
  } catch (error) {
    console.error(`Could not initialize the ${brandName} catalogue.`, error);
    loadError.hidden = false;
    loadError.textContent = `The collection could not be loaded. Check the JSON files in the data folder and open this site through a local or hosted web server. ${error.message}`;
  }
}

mainNav.addEventListener("click", (event) => {
  if (!event.target.closest(".nav-link")) return;
  mainNav.classList.remove("open");
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Open navigation");
});

menuToggle.addEventListener("click", () => {
  const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!isExpanded));
  menuToggle.setAttribute("aria-label", isExpanded ? "Open navigation" : "Close navigation");
  mainNav.classList.toggle("open", !isExpanded);
});

productSlides.addEventListener("click", (event) => {
  const button = event.target.closest(".size-guide");
  if (!button) return;

  const isPant = button.closest(".product-slide").dataset.category === "pant";
  toast.textContent = isPant
    ? "Our chinos have a mid-rise fit. Choose your usual waist size for a relaxed fit."
    : "Our relaxed fit runs true to size. For a closer fit, choose one size down.";
  toast.classList.add("visible");
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => toast.classList.remove("visible"), 3500);
});

initializeCatalogue();
