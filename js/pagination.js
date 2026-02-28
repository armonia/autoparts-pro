// ============================================================
//  INFINITE SCROLL ENGINE
// ============================================================
class InfiniteScroll {
  /**
   * @param {HTMLElement|string} container - Target element (tbody for tables, div for grids)
   * @param {Function} fetchBatch - async (offset, limit) => items[]
   * @param {Object} options
   * @param {number} options.pageSize - Items per batch (default 30)
   * @param {Function} options.renderItem - (item) => HTML string or HTMLElement
   * @param {Function} options.onEmpty - Called when first batch returns empty
   */
  constructor(container, fetchBatch, options = {}) {
    this.container = typeof container === 'string' ? document.getElementById(container) : container;
    this.fetchBatch = fetchBatch;
    this.pageSize = options.pageSize || 30;
    this.renderItem = options.renderItem || null;
    this.onEmpty = options.onEmpty || null;
    this.offset = 0;
    this.loading = false;
    this.done = false;

    // Sentinel: placed after the table (if container is tbody) or after the container
    this.sentinel = document.createElement('div');
    this.sentinel.className = 'is-sentinel';
    const anchor = this.container.closest('table') || this.container;
    if (anchor.parentNode) {
      anchor.parentNode.insertBefore(this.sentinel, anchor.nextSibling);
    }

    this.sentinel.innerHTML = '<div class="is-spinner"><div class="spinner"></div></div>';
    this.spinnerEl = this.sentinel.querySelector('.is-spinner');
    this.spinnerEl.style.display = 'none';

    this.observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !this.loading && !this.done) this._load();
    }, { rootMargin: '200px' });
    this.observer.observe(this.sentinel);

    this._load();
  }

  async _load() {
    if (this.loading || this.done) return;
    this.loading = true;
    this.spinnerEl.style.display = '';

    try {
      const items = await this.fetchBatch(this.offset, this.pageSize);
      if (!items || !items.length) {
        this.done = true;
        if (this.offset === 0 && this.onEmpty) this.onEmpty();
        return;
      }

      items.forEach(item => {
        if (this.renderItem) {
          const html = this.renderItem(item);
          if (typeof html === 'string') {
            this.container.insertAdjacentHTML('beforeend', html);
          } else if (html instanceof HTMLElement) {
            this.container.appendChild(html);
          }
        }
      });

      this.offset += items.length;
      if (items.length < this.pageSize) this.done = true;
    } catch (err) {
      this.done = true;
    } finally {
      this.loading = false;
      this.spinnerEl.style.display = 'none';
    }
  }

  reset() {
    this.container.innerHTML = '';
    this.offset = 0;
    this.done = false;
    this.loading = false;
    this.observer.disconnect();
    this.observer.observe(this.sentinel);
    this._load();
  }

  destroy() {
    this.observer.disconnect();
    if (this.sentinel && this.sentinel.parentNode) this.sentinel.remove();
  }
}
