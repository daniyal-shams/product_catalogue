const brandName = "Epic & Flair";
const whatsappNumber = "919876543210";
const catalogueUrl = new URL("data/catalogue.json", document.baseURI);
const metaAdsConfigUrl = new URL("data/meta-ads.json", document.baseURI);
const deck = document.querySelector("#deck");
const productSlides = document.querySelector("#product-slides");
const loadError = document.querySelector("#load-error");
const toast = document.querySelector("#toast");
const menuToggle = document.querySelector("#menu-toggle");
const mainNav = document.querySelector(".main-nav");
const consentPanel = document.querySelector("#consent-panel");
const privacySettings = document.querySelector("#privacy-settings");
let toastTimeout;
let metaAdsConfig;
let metaConsent = null;
let metaPixelInitialized = false;
let pantViewed = false;

const supportedMetaEvents = new Set(["PageView", "ViewContent", "Contact", "Lead"]);

function validateMetaAdsConfig(config, url) {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error(`${url.pathname} must contain a JSON object.`);
  }

  if (typeof config.enabled !== "boolean" || typeof config.pixelId !== "string") {
    throw new Error(`${url.pathname} must include enabled and pixelId values.`);
  }

  if (config.pixelId && !/^\d{5,20}$/.test(config.pixelId)) {
    throw new Error(`${url.pathname} pixelId must be a numeric Meta Pixel ID.`);
  }

  if (typeof config.requireConsent !== "boolean") {
    throw new Error(`${url.pathname} requireConsent must be a boolean.`);
  }

  if (!Array.isArray(config.events) || !config.events.every(
    (event) => typeof event === "string" && supportedMetaEvents.has(event),
  )) {
    throw new Error(`${url.pathname} events must contain supported Meta standard event names.`);
  }

  return config;
}

function trackMetaEvent(eventName, parameters) {
  if (
    !metaAdsConfig?.enabled
    || metaConsent !== "accepted"
    || !metaAdsConfig.events.includes(eventName)
    || typeof window.fbq !== "function"
  ) {
    return;
  }

  if (parameters) window.fbq("track", eventName, parameters);
  else window.fbq("track", eventName);
}

function markPantViewed() {
  if (pantViewed) return;

  pantViewed = true;
  trackMetaEvent("ViewContent", { content_category: "Pants" });
}

function initializeMetaPixel() {
  if (metaConsent !== "accepted" || !metaAdsConfig?.enabled || !metaAdsConfig.pixelId) return;

  if (typeof window.fbq !== "function") {
    const fbq = function (...args) {
      if (fbq.callMethod) fbq.callMethod.apply(fbq, args);
      else fbq.queue.push(args);
    };
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.queue = [];
    window.fbq = fbq;
    window._fbq = fbq;

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    script.onerror = () => console.error("Could not load the Meta Pixel library.");
    document.head.appendChild(script);
  }

  window.fbq("consent", "grant");
  if (!metaPixelInitialized) {
    window.fbq("init", metaAdsConfig.pixelId);
    metaPixelInitialized = true;
  }

  trackMetaEvent("PageView");
  if (pantViewed) trackMetaEvent("ViewContent", { content_category: "Pants" });
}

function saveMetaConsent(choice) {
  metaConsent = choice;
  try {
    localStorage.setItem("metaAdsConsent", choice);
  } catch (error) {
    console.error("Could not save Meta advertising consent in this browser.", error);
  }

  if (choice === "accepted") {
    initializeMetaPixel();
  } else if (metaPixelInitialized && typeof window.fbq === "function") {
    window.fbq("consent", "revoke");
  }

  consentPanel.hidden = true;
}

async function initializeMetaAds() {
  try {
    metaAdsConfig = validateMetaAdsConfig(
      await loadJson(metaAdsConfigUrl),
      metaAdsConfigUrl,
    );
    if (!metaAdsConfig.enabled) return;
    if (!metaAdsConfig.pixelId) {
      console.info("Meta Pixel is inactive until a Pixel ID is set in data/meta-ads.json.");
      return;
    }

    privacySettings.hidden = false;
    privacySettings.addEventListener("click", () => {
      consentPanel.hidden = false;
    });
    document.querySelector("#consent-accept").addEventListener("click", () => {
      saveMetaConsent("accepted");
    });
    document.querySelector("#consent-reject").addEventListener("click", () => {
      saveMetaConsent("rejected");
    });

    try {
      const savedConsent = localStorage.getItem("metaAdsConsent");
      if (savedConsent === "accepted" || savedConsent === "rejected") {
        metaConsent = savedConsent;
      }
    } catch (error) {
      console.error("Could not read Meta advertising consent from this browser.", error);
    }

    if (!metaAdsConfig.requireConsent) {
      metaConsent = "accepted";
      initializeMetaPixel();
    } else if (metaConsent === "accepted") {
      initializeMetaPixel();
    } else if (metaConsent !== "rejected") {
      consentPanel.hidden = false;
    }
  } catch (error) {
    console.error("Could not initialize Meta Ads tracking.", error);
  }
}

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
  const pantDetails = `
    <div class="chino-bottom product-pant-bottom">
      <div class="chino-specs">
        <span class="detail-label">DETAILS</span>
        <div class="chino-spec-list">
          ${product.details.map((detail) => `<span>${escapeHtml(detail)}</span>`).join("")}
        </div>
      </div>
      <div class="care-guide">
        <span class="detail-label">CARE</span>
        <div class="care-items">${product.care.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
      </div>
    </div>`;
  const enquiryMessage = `Hello ${brandName}, I'm interested in the ${product.name} in ${product.color}. Could you share more details?`;

  return `
        <div class="section-heading">
          <div>
            <h2 class="section-title" id="${product.category}-title">${escapeHtml(product.headingLead)} <em>${escapeHtml(product.headingAccent)}</em></h2>
          </div>
          <p class="section-intro">${escapeHtml(product.intro)}</p>
        </div>
        <div class="product-layout">
          <div class="product-visual">
            <div class="image-frame product-frame pant-frame">
              <img class="product-image${imageFitClass}" src="${escapeHtml(product.imageUrl)}" alt="${escapeHtml(product.imageAlt)}"${imageFilter} loading="lazy" />
              <div class="image-vignette" aria-hidden="true"></div>
              <div class="shade-tag">
                <span class="shade-dot" style="background-color: ${escapeHtml(product.colorHex)}"></span>
                <span><small>SELECTED COLOUR</small><strong>${escapeHtml(product.color)}</strong></span>
              </div>
            </div>
            <div class="spec-row" aria-label="${escapeHtml(product.name)} specifications">${specs}</div>
        </div>
        <div class="product-details">
          <div class="product-meta">
            <span class="product-price">${escapeHtml(product.price)}</span>
          </div>
          <h3 class="product-title">${escapeHtml(product.name)}</h3>
          <p class="product-description">${escapeHtml(product.description)}</p>
          <div class="detail-divider"></div>
          <div class="size-row">
            <span class="detail-label">WAIST</span>
            <div class="size-badges" aria-label="Available sizes">${sizes}</div>
            <button class="size-guide" type="button">Size guide <span aria-hidden="true">↗</span></button>
          </div>
          <div class="color-heading">
            <span class="detail-label">AVAILABLE COLOURS</span>
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

function renderProductSlide(product, categoryProducts, slideIndex) {
  const categoryHeadingId = `${product.category}-title`;
  return `
    <section class="slide chino-slide product-slide pant-product-slide" id="slide-${slideIndex}" data-category="${product.category}" aria-labelledby="${categoryHeadingId}">
      <div class="product-content">${renderProductContent(product, categoryProducts, 0)}</div>
    </section>`;
}

function updateNavigation(contactSlideId) {
  document.querySelector('[data-nav="pant"]').href = "#slide-2";
  document.querySelector('[data-nav="visit"]').href = `#${contactSlideId}`;
  document.querySelector(".hero-card.chino-card").href = "#slide-2";
  document.querySelector("#slide-contact").id = contactSlideId;
}

function activateSlide(section, navigationLinks) {
  navigationLinks.forEach((link) => {
    const target = link.dataset.nav;
    const isActive = target === "home"
      ? section.id === "slide-1"
      : target === "visit"
        ? section.classList.contains("contact-slide")
        : section.dataset.category === target;
    link.classList.toggle("active", isActive);
  });

}

async function initializeCatalogue() {
  try {
    const manifest = await loadJson(catalogueUrl);
    if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
      throw new Error("data/catalogue.json must contain a JSON object.");
    }

    const pants = await loadCategoryProducts(manifest.pant, "pant", catalogueUrl);

    const categoryProducts = { pant: pants };
    const productSlidesData = [
      { product: pants[0], variants: pants },
    ];

    productSlides.innerHTML = productSlidesData.map((item) =>
      renderProductSlide(item.product, item.variants, 2),
    ).join("");

    updateNavigation("slide-3");
    if (location.hash === "#slide-2") markPantViewed();

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
    const slideSections = [...deck.querySelectorAll(".slide")];
    const slideObserver = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
        if (visibleEntry) {
          activateSlide(visibleEntry.target, navigationLinks);
          if (visibleEntry.target.dataset.category === "pant") markPantViewed();
        }
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

document.addEventListener("click", (event) => {
  const link = event.target.closest("a");
  if (!link) return;

  if (link.getAttribute("href") === "#slide-2") markPantViewed();
  if (link.href.startsWith("https://wa.me/")) {
    trackMetaEvent("Contact", { content_name: "WhatsApp enquiry" });
    trackMetaEvent("Lead", { content_name: "WhatsApp enquiry" });
  }
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

  toast.textContent = "Our chinos have a mid-rise fit. Choose your usual waist size for a relaxed fit.";
  toast.classList.add("visible");
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => toast.classList.remove("visible"), 3500);
});

initializeMetaAds();
initializeCatalogue();
