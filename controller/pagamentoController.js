require("dotenv").config()
const axios = require("axios")
const qs = require("qs")
const Order = require("../models/Order")

const createPaymentOrder = async (req, res) => {
    const data = req.body
    try {
        const clientID = process.env.VIVA_CLIENT_ID
        const clientSecret = process.env.VIVA_CLIENT_SECRET
        const demoTokenUrl = process.env.DEMO_TOKEN_URL
        const demoCheckoutOrdersUrl = process.env.DEMO_CHECKOUT_ORDERS_URL

        const orderPayload = {
            accessToken: data.accessToken,
            amount: data.amount,
            customerTrns: data.customerTrns,
            customer: {
                email: data.email,
                fullName: data.fullName,
                phone: data.phone,
                requestLang: data.requestLang,
            },
            dynamicDescriptor: data.dynamicDescriptor,
            paymentTimeout: data.paymentTimeout,
            preauth: data.preauth,
            allowRecurring: data.allowRecurring,
            maxInstallments: data.maxInstallments,
            merchantTrns: data.merchantTrns,
            paymentNotification: data.paymentNotification,
            tipAmount: data.tipAmount,
            disableExactAmount: data.disableExactAmount,
            disableCash: data.disableCash,
            disableWallet: data.disableWallet,
            sourceCode: data.sourceCode,
            cart: data.cart,
            agendamento: data.agendamento,
            pagamentoNaEntrega: data.pagamentoNaEntrega,
            paymentMethodDetails: data.paymentMethodDetails,
            localizacao: data.localizacao,
            status: data.status,
            user_info: data.user_info,
            frete: data.frete,
        }

        // Salvar dados no banco de dados
        const newOrder = new Order(orderPayload)
        const savedInitialOrder = await newOrder.save()

        const response = await axios.post(demoTokenUrl,
            qs.stringify({ grant_type: "client_credentials" }), {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": `Basic ${Buffer.from(`${clientID}:${clientSecret}`).toString("base64")}`,
            },
        })

        const accessToken = response.data.access_token
        const orderResponse = await axios.post(demoCheckoutOrdersUrl,
            orderPayload,
            {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${accessToken}`,
                },
            }
        )

        if (orderResponse.status === 200) {
            console.log("Ordem criada no backend: ", orderResponse.data)

            // Atualizar o pedido com o orderCode
            const updatedOrder = await Order.findByIdAndUpdate(
                savedInitialOrder._id,
                { $set: { orderCode: orderResponse.data.orderCode } },
                { new: true } // Retorna o objeto atualizado
            )

            // Verifica se a atualização foi bem-sucedida
            if (!updatedOrder) {
                return res.status(500).json({ error: "Falha ao atualizar o pedido com o orderCode." })
            }

            // Envia o objeto atualizado com orderCode para o frontend
            res.status(200).json({
                orderCode: updatedOrder.orderCode,
                message: "Ordem de pagamento criada com sucesso.",
            })
        } else {
            // Verifica se a resposta do viva wallet existe e manda o erro caso exista
            const errorMessage = orderResponse.response
                ? orderResponse.response.data ||
                "Erro ao processar o pagamento no Viva Wallet."
                : "Erro ao processar o pagamento."
            return res.status(400).json({ error: errorMessage })
        }
    } catch (error) {
        res.status(500).json({ error: "Erro ao criar ordem de pagamento." })
        console.log("Erro ao fazer pagamento: ", error)
    }
}

const savecashOnDelivery = async (req, res) => {
    try {
        const data = req.body
        console.log("Pedido para pagamento na entrega salvo: ", data)

        const orderToSave = {
            amount: data.amount,
            customerTrns: data.customerTrns,
            customer: {
                email: data.email,
                fullName: data.fullName,
                phone: data.phone,
                requestLang: data.requestLang,
            },
            dynamicDescriptor: data.dynamicDescriptor,
            paymentTimeout: data.paymentTimeout,
            preauth: data.preauth,
            allowRecurring: data.allowRecurring,
            maxInstallments: data.maxInstallments,
            merchantTrns: data.merchantTrns,
            paymentNotification: data.paymentNotification,
            tipAmount: data.tipAmount,
            disableExactAmount: data.disableExactAmount,
            disableCash: data.disableCash,
            disableWallet: data.disableWallet,
            sourceCode: data.sourceCode,
            cart: data.cart,
            agendamento: data.agendamento,
            pagamentoNaEntrega: data.pagamentoNaEntrega,
            paymentMethodDetails: data.paymentMethodDetails,
            localizacao: data.localizacao,
            status: data.status,
            user_info: data.user_info,
            frete: data.frete,
        }

        console.log("Salvando pedido de pagamento na entrega: ", orderToSave)
        const newOrder = new Order(orderToSave)
        await newOrder.save()
        res.status(200).json({ message: "Pedido salvo com sucesso." })
    } catch (error) {
        console.log("Erro ao salvar pedido: ", error)
        res.status(400).json({
            message: "Erro ao salvar pedido." + error
        })
        console.log("Erro ao salvar pedido: ", error)
    }
}

const getCustomAllOrders = async (req, res) => {
    try {
        const data = req.query
        console.log("Solicitando dados de pagamento: ", data)

        const orders = await Order.find()
        res.status(200).json(orders)
    } catch (error) {
        res.status(400).json({
            message: "Erro ao obter dados de pagamento." + error
        })
        console.log("Erro ao obter dados de pagamento: ", error)
    }
}

// Função para deletar um pedido pelo ID
const deleteOrderByID = async (req, res) => {
    try {
        const orderID = req.params.id
        console.log("Deletando pedido do ID: ", orderID)
        const order = await Order.findByIdAndDelete(orderID)
        res.status(200).json(order)
    } catch (error) {
        res.status(400).json({
            message: "Erro ao deletar pedido: " + error
        })
        console.log("Erro ao deletar pedido: ", error)
    }
}

// Função para atualizar o status de um pedido
const updateOrderByID = async (req, res) => {
    try {
        const orderId = req.params.id
        const updatedOrder = await Order.findByIdAndUpdate(orderId, { $set: req.body }, { new: true })
        res.status(200).json(updatedOrder)
    } catch (err) {
        res.status(500).json(err)
    }
}

module.exports = {
    createPaymentOrder,
    getCustomAllOrders,
    savecashOnDelivery,
    deleteOrderByID,
    updateOrderByID
}