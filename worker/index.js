// Worker tipis untuk hosting statis: seluruh request dilayani dari aset hasil build Vite.
export default {
  async fetch(request, env) {
    return env.ASSETS.fetch(request);
  },
};
