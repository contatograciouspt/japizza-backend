// zoneSoftController.js
const axios = require("axios")
const crypto = require("crypto")

// Recupera as variáveis de ambiente
const clientId = process.env.ZONESOFT_CLIENT_ID
const appKey = process.env.ZONESOFT_APP_KEY
const secretKey = process.env.ZONESOFT_APP_SECRET
const appName = "Japizza"
const apiUrlOrder = "https://zsroi.zonesoft.org/v1.0/integration/order"
const apiUrlMenu = "https://zsroi.zonesoft.org/v1.0/integration/menu"

// Função para gerar a assinatura HMAC
function generateHmacSignature(body, secret) {
    return crypto.createHmac("sha256", secret).update(body).digest("hex")
}

// Função para obter o menu
const zoneSoftMenu = async (req, res) => {
    try {
        const response = await axios.get(apiUrlMenu, {
            headers: {
                "Authorization": appKey
            }
        })
        console.log("Menu da Japizza: ", response.data)
        res.status(200).json(response.data) // Retorna os dados do menu
    } catch (error) {
        console.error("Erro ao obter o menu:", error.response ? error.response.data : error.message)
        res.status(500).json({ error: "Erro ao obter o menu", details: error.response ? error.response.data : error.message })
    }
}

// Função para enviar o pedido
const zoneSoftOrder = async (req, res) => {
    try {
        const orderData = req.body
        const body = JSON.stringify(orderData)
        const signature = generateHmacSignature(body, secretKey)

        console.log("Enviando pedido para ZoneSoft:", body) // Log do corpo da requisição
        console.log("Assinatura HMAC:", signature) // Log da assinatura

        const response = await axios.post(apiUrlOrder, body, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": appKey,
                "X-Integration-Signature": signature
            }
        })

        console.log("Resposta da API:", response.data)
        res.status(200).json(response.data)
    } catch (error) {
        console.error("Erro ao enviar o pedido:", error) // Log do objeto de erro completo

        // Tenta extrair informações detalhadas do erro
        let details = {}
        if (error.response) {
            details = {
                status: error.response.status,
                data: error.response.data,
                headers: error.response.headers
            }
        } else if (error.request) {
            details = { request: error.request }
        } else {
            details = { message: error.message }
        }

        console.error("Detalhes do erro:", details)  // Log dos detalhes

        res.status(500).json({ error: "Erro ao enviar o pedido", details: details })
    }
}

const zoneSoftLogin = async (req, res) => {
    try {
        const data = req.body
        console.log("Dados de login recebidos: ", data)

        const { app_store_username, app_store_secret } = data

        if (app_store_username === appName && app_store_secret === appKey) {
            const token = "TOKEN_DE_AUTENTICACAO"

            res.status(200).json({
                message: "Login realizado com sucesso.",
                token: token
            })
        } else {
            res.status(401).json({ error: "Credenciais inválidas." })
        }

    } catch (error) {
        console.error("Erro ao fazer login: ", error)
        res.status(500).json({ error: "Erro ao fazer login." })
    }
}

const zoneSoftPos = async (req, res) => {
    try {
        const posData = req.body
        console.log("Dados de POS recebidos: ", posData)

        res.status(200).json({ message: "Confirmação de recebimento recebida com sucesso." })
    } catch (error) {
        console.error("Erro ao receber confirmação de recebimento: ", error)
        res.status(500).json({ error: "Erro ao receber confirmação de recebimento." })
    }
}

module.exports = {
    zoneSoftLogin,
    zoneSoftMenu,
    zoneSoftOrder,
    zoneSoftPos
}