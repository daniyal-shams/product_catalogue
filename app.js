const shirtVariants = [
  { name: "Ink", color: "#22242a", filter: "grayscale(.45) brightness(.42) sepia(.12)" },
  { name: "Chalk", color: "#e8e3d8", filter: "grayscale(.55) brightness(1.28) sepia(.1)" },
  { name: "Stone", color: "#aaa294", filter: "grayscale(.5) brightness(.85) sepia(.18)" },
  { name: "Oat", color: "#c4b397", filter: "grayscale(.45) brightness(.91) sepia(.33)" },
  { name: "Sage", color: "#788273", filter: "hue-rotate(15deg) saturate(.62) brightness(.75)" },
  { name: "Olive", color: "#66664d", filter: "hue-rotate(18deg) saturate(.75) brightness(.62)" },
  { name: "Moss", color: "#555e4d", filter: "hue-rotate(24deg) saturate(.65) brightness(.61)" },
  { name: "Forest", color: "#33443b", filter: "hue-rotate(35deg) saturate(.75) brightness(.48)" },
  { name: "Sky", color: "#a9c0c6", filter: "hue-rotate(168deg) saturate(.42) brightness(.9)" },
  { name: "Slate", color: "#65747b", filter: "hue-rotate(169deg) saturate(.5) brightness(.66)" },
  { name: "Denim", color: "#536879", filter: "hue-rotate(181deg) saturate(.68) brightness(.62)" },
  { name: "Navy", color: "#303e53", filter: "hue-rotate(190deg) saturate(.75) brightness(.48)" },
  { name: "Blush", color: "#c99b93", filter: "hue-rotate(305deg) saturate(.55) brightness(.9)" },
  { name: "Terracotta", color: "#aa6650", filter: "hue-rotate(322deg) saturate(.78) brightness(.73)" },
  { name: "Rust", color: "#965a3e", filter: "hue-rotate(333deg) saturate(.83) brightness(.68)" },
  { name: "Espresso", color: "#55443c", filter: "sepia(.4) saturate(.7) brightness(.49)" },
];

const whatsappNumber = "919876543210";
const imageUrl =
  "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=1300&q=90";
const swatchGrid = document.querySelector("#swatch-grid");
const shadeName = document.querySelector("#shade-name");
const shadeLabel = document.querySelector("#selected-shade-label");
const shadeDot = document.querySelector("#shade-dot");
const shirtImageFront = document.querySelector("#shirt-image-front");
const shirtImageBack = document.querySelector("#shirt-image-back");
const shirtInquiry = document.querySelector("#shirt-inquiry");
const deck = document.querySelector("#deck");
const toast = document.querySelector("#toast");
const menuToggle = document.querySelector("#menu-toggle");
const mainNav = document.querySelector(".main-nav");
let activeVariant = -1;
let showingFront = true;
let toastTimeout;

function updateInquiry(variant) {
  const message = `Hello AURA, I'm interested in the Essential Cotton Shirt in ${variant.name}. Could you share more details?`;
  shirtInquiry.href = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}

function selectVariant(index) {
  const variant = shirtVariants[index];
  if (!variant || index === activeVariant) return;

  activeVariant = index;
  const incomingImage = showingFront ? shirtImageBack : shirtImageFront;
  const outgoingImage = showingFront ? shirtImageFront : shirtImageBack;
  incomingImage.src = imageUrl;
  incomingImage.style.filter = variant.filter;
  incomingImage.alt = `AURA essential shirt in ${variant.name}`;

  requestAnimationFrame(() => {
    incomingImage.style.opacity = "1";
    outgoingImage.style.opacity = "0";
  });
  showingFront = !showingFront;
  shadeName.textContent = variant.name;
  shadeLabel.textContent = variant.name;
  shadeDot.style.backgroundColor = variant.color;
  updateInquiry(variant);

  swatchGrid.querySelectorAll(".swatch").forEach((swatch, swatchIndex) => {
    const isActive = swatchIndex === index;
    swatch.classList.toggle("active", isActive);
    swatch.setAttribute("aria-pressed", String(isActive));
  });
}

shirtVariants.forEach((variant, index) => {
  const swatch = document.createElement("button");
  swatch.type = "button";
  swatch.className = "swatch";
  swatch.style.backgroundColor = variant.color;
  swatch.setAttribute("aria-label", variant.name);
  swatch.setAttribute("aria-pressed", "false");
  swatch.title = variant.name;
  swatch.addEventListener("click", () => selectVariant(index));
  swatchGrid.append(swatch);
});

selectVariant(0);
swatchGrid.querySelector(".swatch")?.classList.add("active");
swatchGrid.querySelector(".swatch")?.setAttribute("aria-pressed", "true");

const slideSections = [...document.querySelectorAll(".slide")];
const navigationLinks = [...document.querySelectorAll(".nav-link")];
const indicators = [...document.querySelectorAll(".indicator")];

const slideObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const currentIndex = slideSections.indexOf(entry.target);
      navigationLinks.forEach((link, index) => {
        link.classList.toggle("active", index === currentIndex);
      });
      indicators.forEach((indicator, index) => {
        indicator.classList.toggle("active", index === currentIndex);
      });
    });
  },
  { root: deck, threshold: 0.55 },
);

slideSections.forEach((section) => slideObserver.observe(section));

navigationLinks.forEach((link) => {
  link.addEventListener("click", () => {
    mainNav.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation");
  });
});

menuToggle.addEventListener("click", () => {
  const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!isExpanded));
  menuToggle.setAttribute("aria-label", isExpanded ? "Open navigation" : "Close navigation");
  mainNav.classList.toggle("open", !isExpanded);
});

document.querySelector("#size-guide").addEventListener("click", () => {
  toast.textContent = "Our relaxed fit runs true to size. For a closer fit, choose one size down.";
  toast.classList.add("visible");
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => toast.classList.remove("visible"), 3500);
});

updateInquiry(shirtVariants[0]);
