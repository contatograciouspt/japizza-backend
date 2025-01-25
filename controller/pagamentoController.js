require("dotenv").config();
const axios = require("axios");
const qs = require("qs");
const OrderCustomizado = require("../models/OrderCustomizado");
const Order = require("../models/Order");

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
        };

        const orderToSave = {
            amount: data.amount,
            customerTrns: data.customerTrns,
            email: data.customer.email,
            fullName: data.customer.fullName,
            phone: data.customer.phone,
            requestLang: data.customer.requestLang,
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
            // dados customizados
            user_info: {
                name: data.customer.fullName,
                email: data.customer.email,
                contact: data.customer.phone,
                address: data.customerTrns,
            },
            shippingCost: data.shippingCost,
            discount: data.discount || 0,
            total: data.amount,
            subtTotal: data.amount,
            cardInfo: data.cardInfo,
            status: data.status,
            paymentMethod: data.paymentMethod,
            paymentNotification: data.paymentNotification,
            installments: data.installments,
            orderCode: data.orderCode,
        }

        console.log("Dados de Pagamento Ajustados: ", orderToSave)

        // Salvar dados no banco de dados
        const newOrder = new Order(orderToSave);
        await newOrder.save();

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
            res.status(200).json({
                orderCode: orderResponse.data.orderCode,
                message: "Ordem de pagamento criada com sucesso.",
            })
        } else {
            res.status(400).json({
                error: orderResponse.response?.data || "Erro ao processar o pagamento.",
            })
        }
    } catch (error) {
        console.log("Erro ao fazer pagamento: ", error)
    }
}

const savecashOnDelivery = async (req, res) => {
    try {
        const data = req.body
        console.log("Salvando pedido de pagamento na entrega: ", data)

        const orderToSave = {
            amount: data.amount,
            customerTrns: data.customerTrns,
            email: data.customer.email,
            fullName: data.customer.fullName,
            phone: data.customer.phone,
            requestLang: data.customer.requestLang,
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
            // dados customizados
            user_info: {
                name: data.customer.fullName,
                email: data.customer.email,
                contact: data.customer.phone,
                address: data.customerTrns,
            },
            shippingCost: data.shippingCost,
            discount: data.discount || 0,
            total: data.amount,
            subtTotal: data.amount,
            cardInfo: data.cardInfo,
            status: data.status,
            paymentMethod: data.paymentMethod,
            paymentNotification: data.paymentNotification,
            installments: data.installments,
            orderCode: data.orderCode,
        }

        console.log("Salvando pedido de pagamento na entrega: ", orderToSave)
        const newOrder = new Order(orderToSave);
        await newOrder.save();
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

        const orders = await OrderCustomizado.find()
        res.status(200).json(orders)
    } catch (error) {
        res.status(400).json({
            message: "Erro ao obter dados de pagamento." + error
        })
        console.log("Erro ao obter dados de pagamento: ", error)
    }
}

module.exports = {
    createPaymentOrder,
    getCustomAllOrders,
    savecashOnDelivery
}