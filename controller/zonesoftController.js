// zoneSoftController.js
const axios = require("axios")
const crypto = require("crypto")
const jwt = require("jsonwebtoken")
const Order = require("../models/Order")
const Menu = require("../models/Menu")
const Product = require("../models/Product")

// Recupera as variáveis de ambiente
const clientId = process.env.ZONESOFT_CLIENT_ID
const appKey = process.env.ZONESOFT_APP_KEY
const secretKey = process.env.ZONESOFT_APP_SECRET
const appName = "Japizza"
const apiUrlOrder = "https://zsroi.zonesoft.org/v1.0/integration/order"

// Função para gerar a assinatura HMAC
function generateHmacSignature(body, secret) {
    return crypto.createHmac("sha256", secret).update(body).digest("hex")
}

/**
 * Endpoint para sincronização do menu.
 * Espera receber o token via query (ou params) e o repassa para a função interna.
 */
const zoneSoftMenu = async (req, res) => {
    try {
        // O menu deve vir no corpo da requisição (JSON)
        const menuData = req.body
        if (!menuData || !menuData.families) {
            return res.status(400).json({ error: "Dados do menu inválidos ou incompletos." })
        }

        // Salva o menu recebido no banco de dados (pode ser feito como novo documento ou atualização, conforme sua lógica)
        // Exemplo: cria um novo registro (você pode implementar lógica para atualizar o menu existente se necessário)
        await Menu.create(menuData)
        console.log("Menu salvo com sucesso!")

        // retornar status 204 conforme documentação da ZoneSoft (sem corpo)
        return res.status(204).end()
    } catch (error) {
        console.error("Erro ao salvar o menu:", error.message)
        res.status(500).json({ error: "Erro ao salvar o menu.", details: error.message })
    }
}

const zoneSoftOrder = async (req, res) => {
    try {
        // const { orderCode } = req.body

        // 1. Valida o parâmetro orderCode (passado via req.body para facilitar testes com POSTMAN)
        const { orderCode } = req.params
        console.log("orderCode recebido em zoneSoftOrder:", orderCode)
        if (!orderCode) {
            return res.status(400).json({ error: "orderCode não fornecido." })
        }

        // 2. Busca a order com o orderCode e status "Pago"
        const order = await Order.findOne({ orderCode: orderCode, status: "Pago" })
        if (!order) {
            return res.status(404).json({ error: "Order não encontrado ou não foi pago." })
        }

        // 3. Converte a order para objeto simples
        const orderData = JSON.parse(JSON.stringify(order))

        // 4. Extrai o item do pedido do primeiro grupo de itens (ajuste se houver múltiplos)
        const orderItem =
            orderData.cart &&
                orderData.cart.length > 0 &&
                orderData.cart[0].cart &&
                orderData.cart[0].cart.length > 0
                ? orderData.cart[0].cart[0]
                : null
        if (!orderItem || !orderItem.productId) {
            throw new Error("Nenhum item de pedido encontrado ou productId ausente.")
        }
        console.log("Product ID do pedido:", orderItem.productId)

        // 5. Busca o produto na collection "products" usando o productId do item do pedido
        const product = await Product.findOne({ productId: orderItem.productId })
        if (!product) {
            throw new Error(`Produto com productId ${orderItem.productId} não encontrado em products.`)
        }
        if (!product.zoneSoftId) {
            throw new Error(`Produto ${orderItem.productId} não possui zoneSoftId mapeado.`)
        }
        console.log("zoneSoftId do produto encontrado:", product.zoneSoftId)

        // 6. Busca o menu sincronizado – assume o menu mais recente
        const menuDoc = await Menu.findOne({}, {}, { sort: { createdAt: -1 } })
        if (!menuDoc || !menuDoc.products) {
            throw new Error("Menu não encontrado ou sem produtos.")
        }
        console.log("Menu encontrado, continuando...")

        // 7. Procura no array "products" do menu um objeto cujo campo "id" seja igual ao product.zoneSoftId
        let matchedMenuProduct = null
        for (const prod of menuDoc.products) {
            if (typeof prod === "object" && String(prod.id) === String(product.zoneSoftId)) {
                matchedMenuProduct = prod
                break
            }
        }
        if (!matchedMenuProduct) {
            throw new Error(`Produto com zoneSoftId ${product.zoneSoftId} não encontrado no menu.`)
        }
        console.log(`Produto correspondente encontrado no menu: ${matchedMenuProduct.name}`)

        // 7.1 Realiza um replace no nome para remover dígitos e espaços iniciais (ex.: "01 MARGUERITA" -> "MARGUERITA")
        const productName = matchedMenuProduct.name
            ? matchedMenuProduct.name
            : ""
        console.log(`Nome do produto encontrado no menu: ${productName}`)

        // 8. Monta o item do pedido usando os dados obtidos
        const productItem = {
            quantity: orderItem.quantity || 1,
            price: Number(matchedMenuProduct.price), // Preço conforme salvo no menu (em centavos)
            discount: orderItem.prices ? (orderItem.prices.discount || 0) : 0,
            name: productName,
            id: matchedMenuProduct.id || "",
            attributes: [] // Adicione atributos se necessário
        }

        // 9. Monta o objeto do pedido conforme o padrão exigido pela ZoneSoft.
        // Convertendo valores monetários para centavos quando necessário.
        const zonesoftOrderData = {
            order_id: order.orderCode.toString(), // string
            store_id: clientId, // string
            type_order: orderData.shippingOption === "shipping" ? "DELIVERY" : "PICKUP", // "DELIVERY" ou "PICKUP"
            order_time: new Date(order.createdAt).toISOString().slice(0, 19).replace("T", " "), // formato "YYYY-MM-DD HH:MM:SS"
            estimated_pickup_time: new Date(new Date(order.createdAt).getTime() + 30 * 60000)
                .toISOString().slice(0, 19).replace("T", " "),
            currency: "EUR", // string
            delivery_fee: Math.round(Number(orderData.shippingCost) * 100) || 0, // number, em centavos
            courier: {
                name: "",           // se não houver, vazio
                phone_number: "",   // vazio
                license_plate: ""   // vazio
            },
            customer: {
                name: orderData.cart[0]?.user_info?.name || "",
                phone: orderData.cart[0]?.user_info?.contact || "",
                nif: orderData.cart[0]?.user_info?.nif || "", // ou "Não informado"
                email: orderData.cart[0]?.user_info?.email || ""
            },
            products: [productItem], // array de produtos já montado
            obs: orderData.customerTrns ? orderData.customerTrns.join(" ") : "",
            orderIsAlreadyPaid: true, // boolean
            payment_type: orderData.payment_type || 1, // number (1,2,...)
            delivery_address: {
                label: orderData.cart[0]?.user_info?.address || "",
                latitude: orderData.merchantTrns || "", // se disponível
                longitude: orderData.merchantTrns || "" // se disponível
            },
            is_picked_up_by_customer: orderData.shippingOption !== "shipping", // boolean
            discounted_products_total: 0, // number
            total_customer_to_pay: Math.round(Number(orderData.total) * 100) || 0, // number em centavos
            payment_charges: {
                total: Number(orderData.amount) || 0,           // number, em centavos
                sub_total: Math.round(Number(orderData.subTotal) * 100) || 0, // number
                tax: 0,                                         // number
                total_fee: 0,                                   // number
                total_fee_tax: 0,                               // number
                bag_fee: 0,                                     // number
                delivery_fee: Math.round(Number(orderData.shippingCost) * 100) || 0, // number
                delivery_fee_tax: 0,                            // number
                small_order_fee: 0,                             // number
                small_order_fee_tax: 0,                         // number
                pick_and_pack_fee: 0,                           // number
                pick_and_pack_fee_tax: 0,                       // number
                tip: 0                                          // number
            }
        }

        console.log("Pedido pronto para ZoneSoft:", zonesoftOrderData)

        // 10. Converte o objeto do pedido para JSON e gera a assinatura HMAC
        const body = JSON.stringify(zonesoftOrderData)
        const signature = generateHmacSignature(body, secretKey)
        console.log("Enviando pedido para ZoneSoft com os dados mapeados...")
        console.log("Assinatura HMAC:", signature)

        // 11. Envia o pedido para o endpoint da ZoneSoft
        const response = await axios.post(apiUrlOrder, body, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": appKey,
                "X-Integration-Signature": signature
            }
        })

        console.log("Resposta da API de pedido:", response.data)
        return res ? res.status(200).json(response.data) : response.data
    } catch (error) {
        console.error(
            "Erro ao enviar o pedido a zoneSoft:",
            error.response ? error.response.data : error.message
        )
        return res && res.status
            ? res.status(500).json({ error: "Erro ao enviar o pedido para ZoneSoft", details: error.message })
            : Promise.reject(error)
    }
}

/**
 * Endpoint de login que gera um token JWT e, opcionalmente, dispara a sincronização do menu.
 */
const zoneSoftLogin = async (req, res) => {
    try {
        const data = req.body
        if (data.app_store_username === appKey && data.app_store_secret === secretKey) {
            const payload = {
                app: appName,
                clientId: clientId,
                timestamp: Date.now()
            }
            const token = jwt.sign(payload, secretKey, { expiresIn: "1h" })
            console.log("Token gerado com sucesso:", token)
            return res.status(200).json({ access_token: token, expires_in: 36000 })
        } else {
            return res.status(401).json({ error: "Credenciais inválidas." })
        }
    } catch (error) {
        console.error("Erro ao fazer login:", error.message)
        res.status(500).json({ error: "Erro ao fazer login", details: error.message })
    }
}

const zoneSoftOrderStatus = async (req, res) => {
    try {
        const { order_id, status } = req.body // order_id é o mesmo que zoneSoftId do produto
        if (!order_id || !status) {
            return res.status(400).json({ error: "order_id and status are required." })
        }

        // Encontra o produto usando o zoneSoftId
        const product = await Product.findOne({ zoneSoftId: order_id })
        if (!product) {
            return res.status(404).json({ error: `Produto com zoneSoftId ${order_id} não encontrado.` })
        }

        // Encontra uma order com status "Pago" que contenha esse produto
        const order = await Order.findOne({
            status: "Pago",
            "cart.cart.productId": product.productId
        })
        if (!order) {
            return res.status(404).json({ error: "Order não encontrado para o produto informado." })
        }

        // Atualiza o status da ordem para o novo status recebido
        order.status = status
        await order.save()
        console.log(`Order ${order.orderCode} atualizada para status: ${status}`)

        // Retorna 204 No Content conforme exigido
        return res.status(204).end()
    } catch (error) {
        console.error("Erro em zoneSoftOrderStatus:", error.message)
        return res.status(500).json({ error: "Erro ao atualizar o status do pedido", details: error.message })
    }
}

const zoneSoftPosOnline = async (req, res) => { // Função para LIGAR o POS (online) - DELETE /pos/status/closing
    try {
        // Lógica para tratar a requisição DELETE (ligar o POS)
        // *** IMPLEMENTAR A LÓGICA REAL PARA COLOCAR O POS ONLINE AQUI ***
        console.log("POS Ligado (Online) - Endpoint DELETE /pos/status/closing");

        return res.status(204).end(); // Retorna 204 No Content conforme documentação
    } catch (error) {
        console.error("Erro em zoneSoftPosOnline:", error.message);
        return res.status(500).json({ error: "Erro ao processar status do POS (Online)", details: error.message });
    }
};


const zoneSoftPosStatus = async (req, res) => { // Função para OBTER STATUS do POS - GET /pos/status
    try {
        // Lógica para obter o status do POS
        // *** IMPLEMENTAR A LÓGICA REAL PARA OBTER O STATUS DO POS AQUI ***
        console.log("Obter Status do POS - Endpoint GET /pos/status");

        // *** FORMATAR A RESPOSTA CONFORME EXEMPLO DA DOCUMENTAÇÃO (STATUS 200) ***
        const responseBody = {
            body: {
                header: {
                    statusCode: 200,
                    statusMessage: "OK",
                    status: "HTTP/1.1 200 OK"
                }
            }
        };

        return res.status(200).json(responseBody); // Retorna 200 com o corpo formatado
    } catch (error) {
        console.error("Erro em zoneSoftPosStatus:", error.message);
        return res.status(500).json({ error: "Erro ao obter status do POS", details: error.message });
    }
};

module.exports = {
    zoneSoftLogin,
    zoneSoftMenu,
    zoneSoftOrder,
    zoneSoftPos,
    zoneSoftOrderStatus,
    zoneSoftPosOnline,
    zoneSoftPosStatus
}
