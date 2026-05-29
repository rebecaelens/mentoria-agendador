(function () {
    const host = window.location.hostname;

    const API_BY_ENV = {
        dev: "http://localhost:3000",
        hml: "https://api-hml.seudominio.com",
        prod: "https://api.seudominio.com"
    };

    if (host === "localhost" || host === "127.0.0.1") {
        window.API_BASE_URL = API_BY_ENV.dev;
        return;
    }

    if (host.includes("hml") || host.includes("homolog")) {
        window.API_BASE_URL = API_BY_ENV.hml;
        return;
    }

    window.API_BASE_URL = API_BY_ENV.prod;
})();
