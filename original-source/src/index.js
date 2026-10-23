export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        if (url.pathname.includes(".")) {
            return env.ASSETS.fetch(request);
        }
        const response = await env.ASSETS.fetch(request);
        if (response.status === 404) {
            return env.ASSETS.fetch(new Request(url.origin + "/index.html"));
        }
        return response;
    }
};
