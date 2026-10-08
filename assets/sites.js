window.SITES = [
  { id: "GG88", color: "#14b8a6" },
  { id: "MM88", color: "#2563eb" },
  { id: "LLWIN", color: "#7c3aed" },
  { id: "XX88", color: "#e11d48" },
];

window.siteColor = (id) => (window.SITES.find((s) => s.id === id) || {}).color || "#374151";

window.siteTag = (id) => `<b style="color:${window.siteColor(id)}">${id}</b>`;

window.fillSiteSelect = (select, selected) => {
  for (const s of window.SITES) {
    const o = document.createElement("option");
    o.value = s.id;
    o.textContent = s.id;
    o.style.color = s.color;
    o.style.fontWeight = "700";
    select.appendChild(o);
  }
  if (selected) select.value = selected;
  const paint = () => {
    select.style.color = select.value ? window.siteColor(select.value) : "#6b7280";
    select.style.fontWeight = select.value ? "800" : "500";
  };
  select.addEventListener("change", paint);
  paint();
};
