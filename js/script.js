const API_CONFIG = {
    baseUrl: window.API_BASE_URL || "http://localhost:3000",
    endpoints: {
        login: "/auth/login",
        me: "/auth/me",
        logout: "/auth/logout",
        agendamentos: "/agendamentos"
    }
};

const state = {
    logado: false,
    emailLogin: "",
    senhaLogin: "",
    nomeUsuario: "",
    authToken: localStorage.getItem("authToken") || "",
    agendamentos: []
};

const ui = {
    loginScreen: document.getElementById("loginScreen"),
    appScreen: document.getElementById("appScreen"),
    loginForm: document.getElementById("loginForm"),
    mentoriaForm: document.getElementById("mentoriaForm"),
    emailLogin: document.getElementById("emailLogin"),
    senhaLogin: document.getElementById("senhaLogin"),
    googleLoginBtn: document.getElementById("googleLoginBtn"),
    logoutBtn: document.getElementById("logoutBtn"),
    nomeUsuario: document.getElementById("nomeUsuario"),
    nome: document.getElementById("nome"),
    localidade: document.getElementById("localidade"),
    mentor: document.getElementById("mentor"),
    horario: document.getElementById("horario"),
    erroNome: document.getElementById("erroNome"),
    erroLocalidade: document.getElementById("erroLocalidade"),
    erroMentor: document.getElementById("erroMentor"),
    erroHorario: document.getElementById("erroHorario"),
    mensagem: document.getElementById("mensagem"),
    agendamentosSection: document.getElementById("agendamentosSection"),
    agendamentosList: document.getElementById("agendamentosList"),
    loginSubmitBtn: document.querySelector('#loginForm button[type="submit"]'),
    agendarSubmitBtn: document.querySelector('#mentoriaForm button[type="submit"]')
};

function getApiUrl(path) {
    return `${API_CONFIG.baseUrl}${path}`;
}

function setToken(token) {
    state.authToken = token || "";

    if (state.authToken) {
        localStorage.setItem("authToken", state.authToken);
        return;
    }

    localStorage.removeItem("authToken");
}

async function request(path, { method = "GET", body, auth = false } = {}) {
    const headers = {
        "Content-Type": "application/json"
    };

    if (auth && state.authToken) {
        headers.Authorization = `Bearer ${state.authToken}`;
    }

    const response = await fetch(getApiUrl(path), {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
    });

    let data = null;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
        data = await response.json();
    }

    if (!response.ok) {
        const errorMessage =
            (data && (data.message || data.error)) ||
            `Erro HTTP ${response.status}`;
        throw new Error(errorMessage);
    }

    return data;
}

function setButtonLoading(button, isLoading, label) {
    if (!button) return;

    button.disabled = isLoading;
    button.dataset.originalLabel = button.dataset.originalLabel || button.innerHTML;

    if (isLoading) {
        button.innerHTML = `<i class="bi bi-arrow-repeat spin"></i><span>${label}</span>`;
        return;
    }

    button.innerHTML = button.dataset.originalLabel;
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function renderTela() {
    ui.loginScreen.classList.toggle("hidden", state.logado);
    ui.appScreen.classList.toggle("hidden", !state.logado);

    if (state.logado) {
        ui.nomeUsuario.textContent = state.nomeUsuario;
    }
}

function mostrarMensagem(texto, tipo) {
    ui.mensagem.textContent = texto;
    ui.mensagem.classList.remove("hidden", "success", "error", "info");
    ui.mensagem.classList.add(tipo);

    setTimeout(() => {
        ui.mensagem.classList.add("hidden");
        ui.mensagem.textContent = "";
        ui.mensagem.classList.remove("success", "error", "info");
    }, 3000);
}

function limparErros() {
    ui.erroNome.textContent = "";
    ui.erroLocalidade.textContent = "";
    ui.erroMentor.textContent = "";
    ui.erroHorario.textContent = "";
}

function renderAgendamentos() {
    ui.agendamentosList.innerHTML = "";

    if (!state.agendamentos.length) {
        ui.agendamentosSection.classList.add("hidden");
        return;
    }

    ui.agendamentosSection.classList.remove("hidden");

    state.agendamentos.forEach((agendamento) => {
        const item = document.createElement("li");
        item.innerHTML = `<i class="bi bi-calendar2-check"></i><span><strong>${escapeHtml(agendamento.nome)}</strong> - ${escapeHtml(agendamento.localidade)} - Mentor: ${escapeHtml(agendamento.mentor)} as ${escapeHtml(agendamento.horario)}</span>`;
        ui.agendamentosList.appendChild(item);
    });
}

async function carregarAgendamentos() {
    const data = await request(API_CONFIG.endpoints.agendamentos, { auth: true });
    state.agendamentos = Array.isArray(data) ? data : data?.items || [];
    renderAgendamentos();
}

async function handleLogin(event) {
    event.preventDefault();

    state.emailLogin = ui.emailLogin.value.trim();
    state.senhaLogin = ui.senhaLogin.value.trim();

    if (!state.emailLogin || !state.senhaLogin) {
        alert("Preencha email e senha!");
        return;
    }

    setButtonLoading(ui.loginSubmitBtn, true, "Entrando...");

    try {
        const data = await request(API_CONFIG.endpoints.login, {
            method: "POST",
            body: {
                email: state.emailLogin,
                senha: state.senhaLogin
            }
        });

        const token = data?.token || data?.accessToken || "";
        const usuario = data?.user || data?.usuario || {};

        if (!token) {
            throw new Error("Resposta de login sem token.");
        }

        setToken(token);
        state.nomeUsuario = usuario?.nome || usuario?.name || state.emailLogin.split("@")[0] || "Usuario";
        state.logado = true;
        renderTela();
        await carregarAgendamentos();
    } catch (error) {
        alert(error.message || "Falha ao autenticar.");
    } finally {
        setButtonLoading(ui.loginSubmitBtn, false, "Entrando...");
    }
}

function handleLoginGoogle() {
    alert("Login Google depende da configuracao OAuth no backend.");
}

async function handleLogout() {
    try {
        if (state.authToken) {
            await request(API_CONFIG.endpoints.logout, {
                method: "POST",
                auth: true
            });
        }
    } catch (_) {
        // Logout local mesmo se o backend estiver indisponivel.
    }

    state.logado = false;
    state.emailLogin = "";
    state.senhaLogin = "";
    state.nomeUsuario = "";
    state.agendamentos = [];
    setToken("");

    ui.emailLogin.value = "";
    ui.senhaLogin.value = "";
    renderAgendamentos();

    renderTela();
}

async function handleAgendamento(event) {
    event.preventDefault();
    limparErros();

    const nome = ui.nome.value.trim();
    const localidade = ui.localidade.value;
    const mentor = ui.mentor.value;
    const horario = ui.horario.value;

    let possuiErro = false;

    if (!nome) {
        ui.erroNome.textContent = "Preencha o nome";
        possuiErro = true;
    }

    if (!localidade) {
        ui.erroLocalidade.textContent = "Preencha a localidade";
        possuiErro = true;
    }

    if (!mentor) {
        ui.erroMentor.textContent = "Preencha o mentor";
        possuiErro = true;
    }

    if (!horario) {
        ui.erroHorario.textContent = "Preencha o horario";
        possuiErro = true;
    }

    if (possuiErro) {
        return;
    }

    setButtonLoading(ui.agendarSubmitBtn, true, "Agendando...");

    try {
        await request(API_CONFIG.endpoints.agendamentos, {
            method: "POST",
            auth: true,
            body: { nome, localidade, mentor, horario }
        });

        await carregarAgendamentos();
        mostrarMensagem("Mentoria agendada com sucesso!", "success");

        ui.nome.value = "";
        ui.localidade.value = "";
        ui.mentor.value = "";
        ui.horario.value = "";
        limparErros();
    } catch (error) {
        mostrarMensagem(error.message || "Erro ao agendar mentoria.", "error");
    } finally {
        setButtonLoading(ui.agendarSubmitBtn, false, "Agendando...");
    }
}

async function restaurarSessao() {
    if (!state.authToken) return;

    try {
        const me = await request(API_CONFIG.endpoints.me, { auth: true });
        const usuario = me?.user || me?.usuario || me || {};

        state.nomeUsuario = usuario?.nome || usuario?.name || "Usuario";
        state.logado = true;
        renderTela();
        await carregarAgendamentos();
    } catch (_) {
        setToken("");
        state.logado = false;
        renderTela();
    }
}

ui.loginForm.addEventListener("submit", handleLogin);
ui.googleLoginBtn.addEventListener("click", handleLoginGoogle);
ui.logoutBtn.addEventListener("click", handleLogout);
ui.mentoriaForm.addEventListener("submit", handleAgendamento);

renderTela();
renderAgendamentos();
restaurarSessao();
