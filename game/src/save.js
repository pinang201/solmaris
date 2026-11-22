// localStorage save — mission progress, cash and collected charms.
window.SOL = window.SOL || {};
SOL.Save = {
  KEY: 'solmaris-save-v1',
  load: function () {
    try { const raw = localStorage.getItem(this.KEY); return raw ? JSON.parse(raw) : null; }
    catch (e) { return null; }
  },
  has: function () { return !!this.load(); },
  store: function (state) {
    try {
      localStorage.setItem(this.KEY, JSON.stringify({
        mission: state.index, cash: state.cash, charms: state.charms,
        finished: !!state.finished, taxiFares: state.taxiFares || 0
      }));
    } catch (e) { /* private mode: play without saving */ }
  },
  clear: function () { try { localStorage.removeItem(this.KEY); } catch (e) {} }
};
