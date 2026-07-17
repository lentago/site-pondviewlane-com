// Edge-fade hints for tables that scroll horizontally (mobile affordance).
// Wraps each overflowing content table in .table-fade and toggles fade-l/fade-r
// as it scrolls; styles live in custom.css under "table scroll affordance".
(() => {
  const update = (wrap, table) => {
    const max = table.scrollWidth - table.clientWidth;
    wrap.classList.toggle('fade-r', max > 2 && table.scrollLeft < max - 2);
    wrap.classList.toggle('fade-l', max > 2 && table.scrollLeft > 2);
  };
  for (const table of document.querySelectorAll('.sl-markdown-content table')) {
    const wrap = document.createElement('div');
    wrap.className = 'table-fade';
    table.parentNode.insertBefore(wrap, table);
    wrap.appendChild(table);
    table.addEventListener('scroll', () => update(wrap, table), { passive: true });
    new ResizeObserver(() => update(wrap, table)).observe(table);
    update(wrap, table);
  }
})();
