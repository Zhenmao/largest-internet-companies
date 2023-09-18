d3.csv(
  "companiesmarketcap.com - Largest internet companies by market cap.csv",
  d3.autoType
).then((data) => {
  new VoronoiTreemap({
    el: document.querySelector("#voronoiTreemap"),
    data,
    keyAccessor: (d) => d.symbol,
    nameAccessor: (d) => d.name,
    valueAccessor: (d) => d.marketcap,
    groupAccessor: (d) => d.country,
    iconAccessor: (d) => `company-logos/${d.symbol}.webp`,
    valueFormat: new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
    }).format,
  });
});
