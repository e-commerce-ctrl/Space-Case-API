const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(express.json());

// Armazena clientes em memória (teste)
const clientes = {};

/**
 * 🔐 WEBHOOK VERIFICAÇÃO (META)
 */
app.get("/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    console.log("Webhook verify request:", req.query);

    if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
        console.log("Webhook verificado com sucesso ✅");
        return res.status(200).send(challenge);
    }

    return res.sendStatus(403);
});

/**
 * 📩 RECEBER MENSAGENS WHATSAPP
 */
app.post("/webhook", async (req, res) => {
    try {
        const body = req.body;

        console.log("Webhook recebido:", JSON.stringify(body, null, 2));

        const mensagem =
            body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body;

        const numero =
            body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from;

        if (!mensagem || !numero) {
            return res.sendStatus(200);
        }

        console.log("Número:", numero);
        console.log("Mensagem:", mensagem);

        await processarFluxo(numero, mensagem);

        return res.sendStatus(200);
    } catch (error) {
        console.error("Erro no webhook:", error.response?.data || error.message);
        return res.sendStatus(500);
    }
});

/**
 * 🧠 LÓGICA DO BOT
 */
async function processarFluxo(numero, mensagem) {
    if (!clientes[numero]) {
        clientes[numero] = {
            etapa: 1
        };
    }

    const cliente = clientes[numero];

    // Etapa 1
    if (cliente.etapa === 1) {
        cliente.etapa = 2;

        return enviarMensagem(
            numero,
            "Olá 👋\nBem-vindo ao atendimento.\n\nDigite o departamento:\n1 - Vendas\n2 - Suporte"
        );
    }

    // Etapa 2
    if (cliente.etapa === 2) {
        cliente.departamento = mensagem;
        cliente.etapa = 3;

        return enviarMensagem(
            numero,
            "Perfeito ✅\nAgora descreva seu pedido."
        );
    }

    // Etapa 3
    if (cliente.etapa === 3) {
        cliente.descricao = mensagem;

        const atendente = pegarProximoAtendente(cliente.departamento);

        return enviarMensagem(
            numero,
            `Obrigado ✅\n\nSeu atendimento foi direcionado para ${atendente}.\nEle irá falar com você em instantes.`
        );
    }
}

/**
 * 👨‍💼 ATENDENTES
 */
function pegarProximoAtendente(departamento) {
    const atendentes = {
        "1": "Carlos - Vendas",
        "2": "Mariana - Suporte"
    };

    return atendentes[departamento] || "Atendente disponível";
}

/**
 * 📤 ENVIAR MENSAGEM WHATSAPP
 */
async function enviarMensagem(numero, texto) {
    try {
        await axios.post(
            `https://graph.facebook.com/v22.0/${process.env.PHONE_NUMBER_ID}/messages`,
            {
                messaging_product: "whatsapp",
                to: numero,
                type: "text",
                text: {
                    body: texto
                }
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
                    "Content-Type": "application/json"
                }
            }
        );

        console.log("Mensagem enviada ✅");
    } catch (error) {
        console.error("Erro ao enviar mensagem:", error.response?.data || error.message);
    }
}

/**
 * 🧪 TESTE MANUAL
 */
app.get("/teste", async (req, res) => {
    try {
        await enviarMensagem("5511919359249", "Teste enviado com sucesso 🚀");
        res.send("Mensagem enviada com sucesso");
    } catch (error) {
        console.error(error.response?.data || error.message);
        res.status(500).send("Erro ao enviar");
    }
});

/**
 * ❤️ HEALTH CHECK (Render)
 */
app.get("/health", (req, res) => {
    res.json({ ok: true });
});

/**
 * 🏠 ROTA PRINCIPAL
 */
app.get("/", (req, res) => {
    res.send("API rodando no Render ✅");
});

/**
 * 🚀 START SERVER
 */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT} 🚀`);
});

app.get("/privacy", (req, res) => {
  res.send(`
    <h1>Política de Privacidade</h1>
    <p>
      Este sistema utiliza dados fornecidos pelo usuário via WhatsApp apenas para fins de atendimento,
      processamento de pedidos e suporte ao cliente.
    </p>
    <p>
      Não compartilhamos dados com terceiros e todas as informações são usadas exclusivamente
      para operação do sistema.
    </p>
    <p>
      Última atualização: ${new Date().toLocaleDateString()}
    </p>
  `);
});
