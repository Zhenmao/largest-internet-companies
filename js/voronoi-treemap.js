class VoronoiTreemap {
  constructor({
    el,
    data,
    keyAccessor,
    nameAccessor,
    valueAccessor,
    groupAccessor,
    iconAccessor,
    valueFormat,
  }) {
    this.el = el;
    this.data = data;
    this.keyAccessor = keyAccessor;
    this.nameAccessor = nameAccessor;
    this.valueAccessor = valueAccessor;
    this.groupAccessor = groupAccessor;
    this.iconAccessor = iconAccessor;
    this.valueFormat = valueFormat;
    this.moved = this.moved.bind(this);
    this.left = this.left.bind(this);
    this.init();
  }

  init() {
    this.dActive = null;

    this.id = this.el.id || `id${randomUUID()}`;

    this.marginTop = 40;
    this.marginRight = 40;
    this.marginBottom = 40;
    this.marginLeft = 40;
    this.width = 800;
    this.height = 800;
    this.r = Math.min(
      (this.width - this.marginLeft - this.marginRight) / 2,
      (this.height - this.marginTop - this.marginBottom) / 2
    );
    this.rGroupLabel = this.r + 20;

    this.container = d3.select(this.el).classed("voronoi-treemap", true);
    this.svg = this.container
      .append("svg")
      .attr("viewBox", [
        -this.width / 2,
        -this.height / 2,
        this.width,
        this.height,
      ])
      .on("pointerover", this.moved)
      .on("pointermove", this.moved)
      .on("pointerout", this.left)
      .on("touchstart", (event) => event.preventDefault(), { passive: true });
    this.voronoiG = this.svg.append("g");
    this.groupLabelsG = this.svg.append("g");
    this.labelsG = this.svg.append("g").attr("pointer-events", "none");

    this.tooltip = this.container.append("div").attr("class", "tooltip");
    this.computeLayout();
  }

  computeLayout() {
    this.root = d3
      .hierarchy(d3.group(this.data, this.groupAccessor))
      .sum(this.valueAccessor);

    const seed = new Math.seedrandom(1);
    const ellipse = d3
      .range(100)
      .map((i) => [
        ((1 + 0.99 * Math.cos((i / 50) * Math.PI)) / 2 - 0.5) * this.r * 2,
        ((1 + 0.99 * Math.sin((i / 50) * Math.PI)) / 2 - 0.5) * this.r * 2,
      ]);
    const voronoiTreemap = d3.voronoiTreemap().prng(seed).clip(ellipse);
    voronoiTreemap(this.root);

    this.render();
  }

  render() {
    this.voronoiG
      .selectAll(".voronoi-path")
      .data(this.root.descendants())
      .join((enter) => enter.append("path").attr("class", "voronoi-path"))
      .attr("d", (d) => d3.line()(d.polygon) + "z")
      .attr("fill", (d) => (d.depth ? "none" : "currentColor"))
      .attr("pointer-events", (d) => (d.height ? "none" : "all"))
      .attr("stroke-width", (d) => {
        switch (d.depth) {
          case 0:
            return 0;
          case 1:
            return 4;
          case 2:
            return 1;
          default:
            return 0;
        }
      });

    this.groupLabelsG
      .selectAll(".group-label-g")
      .data(this.root.children)
      .join((enter) =>
        enter
          .append("g")
          .attr("class", "group-label-g")
          .call((g) =>
            g
              .append("path")
              .attr("class", "group-label-path")
              .attr("fill", "none")
              .attr("id", (d, i) => `${this.id}LabelPath${i}`)
          )
          .call((g) =>
            g
              .append("text")
              .attr("class", "group-label-text")
              .attr("text-anchor", "middle")
              .attr("dy", "0.32em")
              .append("textPath")
              .attr("href", (d, i) => `#${this.id}LabelPath${i}`)
              .attr("startOffset", "50%")
          )
      )
      .call((g) =>
        g.select(".group-label-path").attr("d", (d) => {
          const midAngle =
            Math.atan2(d.polygon.site.y, d.polygon.site.x) + Math.PI / 2;
          const halfArcAngle = Math.PI / 2;
          const flipped =
            midAngle > Math.PI / 2 && midAngle < (Math.PI / 2) * 3;
          const arcPath = d3
            .arc()
            .startAngle(
              flipped ? midAngle + halfArcAngle : midAngle - halfArcAngle
            )
            .endAngle(
              flipped ? midAngle - halfArcAngle : midAngle + halfArcAngle
            )
            .innerRadius(this.rGroupLabel)
            .outerRadius(this.rGroupLabel)();
          return arcPath.slice(0, arcPath.lastIndexOf("A"));
        })
      )
      .call((g) => g.select("textPath").text((d) => d.data[0]));

    this.labelsG
      .selectAll(".label-g")
      .data(this.root.leaves())
      .join((enter) =>
        enter
          .append("g")
          .attr("class", "label-g")
          .call((g) =>
            g.append("image").attr("href", (d) => this.iconAccessor(d.data))
          )
      )
      .call((g) =>
        g.select("image").each((d, i, n) => {
          const size = Math.min(
            64,
            Math.sqrt(this.valueAccessor(d.data) / 1e8)
          );
          d3.select(n[i])
            .attr("x", d.polygon.site.x - size / 2)
            .attr("y", d.polygon.site.y - size / 2)
            .attr("width", size)
            .attr("height", size);
        })
      );
  }

  moved(event) {
    if (!event.target.matches(".voronoi-path")) return;
    const d = d3.select(event.target).datum().data;
    if (this.dActive) {
      const [mx, my] = d3.pointer(event, this.el);
      const bRect = this.el.getBoundingClientRect();
      const tRect = this.tooltip.node().getBoundingClientRect();
      let tx = mx - tRect.width / 2;
      if (tx < 0) {
        tx = 0;
      } else if (tx + tRect.width > bRect.width) {
        tx = bRect.width - tRect.width;
      }
      let ty = my - tRect.height - 16;
      if (ty < 0) {
        ty + my + 16;
      }
      this.tooltip.style("transform", `translate(${tx}px,${ty}px)`);
    }
    if (this.dActive === d) return;
    this.dActive = d;
    d3.select(event.target).classed("is-active", true);
    this.tooltip
      .html(
        `
        <div>${this.valueFormat(this.valueAccessor(d))}</div>
        <div>${this.nameAccessor(d)}</div>
        <div>${this.groupAccessor(d)}</div>
        `
      )
      .classed("is-active", true);
  }

  left(event) {
    if (!event.target.matches(".voronoi-path")) return;
    this.dActive = null;
    d3.select(event.target).classed("is-active", false);
    this.tooltip.classed("is-active", false);
  }
}
