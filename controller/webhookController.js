// const Webhook = require("../models/Webhook")
// const verificationToken = process.env.VERIFICATION_TOKEN
// const Order = require("../models/Order")
// const { zoneSoftOrder } = require("./zonesoftController")

// const webhookConnection = async (req, res) => {
//     console.log("Recebendo verificação do webhook...", req.params)
//     res.status(200).json({ Key: verificationToken })
// }

// // const webhookEvents = async (req, res) => {
// //     const data = req.body
// //     console.log("Webhook recebido: ", data)

// //     try {
// //         switch (data.EventTypeId) {
// //             case 1796: // Transaction Payment Created
// //                 console.log("O pagamento do cliente foi efetuado com sucesso: ", data)
// //                 const newWebhook = new Webhook(data)
// //                 await newWebhook.save()
// //                 console.log("Evento de pagamento salvo com sucesso: ", newWebhook)

// //                 const customerOrderCode = data.EventData?.OrderCode
// //                 console.log("OrderCode do cliente: ", customerOrderCode)
// //                 if (customerOrderCode) {
// //                     // Encontre o usuário pela orderCode para atualizar o status de pago em orders
// //                     const updatedOrder = await Order.findOne({ orderCode: customerOrderCode })

// //                     if (updatedOrder) {
// //                         console.log(`Ordem encontrada com sucesso, atualizando status para Pago ${updatedOrder.orderCode}`)
// //                         updatedOrder.status = 'Pago'
// //                         await updatedOrder.save()
// //                         console.log(`Status da ordem ${updatedOrder.orderCode} atualizado para Pago`)

// //                         // **Chama a função zoneSoftOrder para enviar o pedido**
// //                         try {
// //                             console.log(`Iniciando envio para ZoneSoft: ${customerOrderCode}`)
// //                             await zoneSoftOrder({ params: { orderCode: customerOrderCode } }, {
// //                                 status: (code) => ({
// //                                     json: (obj) => {
// //                                         console.log(`Simulated response with status ${code}`, obj)
// //                                         return { success: true }
// //                                     }
// //                                 })
// //                             })

// //                         } catch (error) {
// //                             console.error("Erro ao enviar:", error)
// //                         }
// //                     } else {
// //                         console.log(`Nenhuma ordem encontrada com o OrderCode: ${customerOrderCode}`)
// //                     }
// //                 } else {
// //                     console.log("Email do cliente não encontrado no webhook data.")
// //                 }
// //                 break

// //             case 1797: // Transaction Reversal Created
// //                 console.log("Um reembolso do cliente foi efetuado com sucesso: ", data)
// //                 break
// //             case 1798: // Transaction Payment Failed
// //                 console.log("O pagamento de um cliente falhou: ", data)
// //                 break
// //             default:
// //                 console.log("Evento desconhecido: ", data)
// //                 break
// //         }

// //         res.status(200).json({ message: "Webhook recebido com sucesso." })
// //     } catch (error) {
// //         console.error("Erro ao processar webhook: ", error)
// //         res.status(500).json({ message: "Erro ao processar webhook" })
// //     }
// // }

// const webhookEvents = async (req, res) => {
//     try {
//         const data = req.body
//         console.log("Webhook recebido:", JSON.stringify(data, null, 2))

//         // Responde 200 OK rapidamente para evitar timeout
//         res.status(200).json({ message: "Webhook recebido com sucesso." })

//         // Agora processa em segundo plano (ideal), ou então processa antes de dar o 200
//         // Exemplo de "processamento assíncrono" (promessa solta, sem aguardar)
//         (async () => {
//             switch (data.EventTypeId) {
//                 case 1796: // Transaction Payment Created
//                     console.log("Pagamento criado: ", data)
//                     await Webhook.create(data)

//                     const customerOrderCode = data.EventData?.OrderCode
//                     if (!customerOrderCode) {
//                         console.log("Nenhum OrderCode encontrado no EventData.")
//                         return
//                     }

//                     const updatedOrder = await Order.findOne({ orderCode: customerOrderCode })
//                     if (!updatedOrder) {
//                         console.log("Order não encontrada para o OrderCode:", customerOrderCode)
//                         return
//                     }

//                     // Atualiza status
//                     updatedOrder.status = "Pago"
//                     await updatedOrder.save()
//                     console.log("Status da ordem atualizado para Pago:", updatedOrder.orderCode)

//                     // Chama ZoneSoft
//                     try {
//                         console.log("Enviando pedido para ZoneSoft:", customerOrderCode)
//                         await zoneSoftOrder(
//                             { params: { orderCode: customerOrderCode } },
//                             {
//                                 status: (code) => ({
//                                     json: (obj) => {
//                                         console.log(`zoneSoftOrder response status ${code}`, obj)
//                                     }
//                                 })
//                             }
//                         )
//                     } catch (error) {
//                         console.error("Erro ao enviar pedido para ZoneSoft:", error)
//                     }
//                     break

//                 case 1797: // Transaction Reversal Created
//                     console.log("Um reembolso foi criado: ", data)
//                     await Webhook.create(data)
//                     // faça algo a mais se necessário
//                     break

//                 case 1798: // Transaction Payment Failed
//                     console.log("Um pagamento falhou: ", data)
//                     await Webhook.create(data)
//                     // faça algo a mais se necessário
//                     break

//                 default:
//                     console.log("Evento não tratado:", data.EventTypeId)
//                     await Webhook.create(data)
//                     break
//             }
//         })().catch((err) => {
//             console.error("Erro no processamento assíncrono do webhook:", err)
//         })

//     } catch (error) {
//         console.error("Erro ao processar webhook: ", error)
//         // Se der erro antes de responder, retorne 500 (mas ideal é responder 200 primeiro)
//         return res.status(500).json({ message: "Erro ao processar webhook" })
//     }
// }


// module.exports = { webhookEvents, webhookConnection }

const Webhook = require("../models/Webhook")
const verificationToken = process.env.VERIFICATION_TOKEN
const Order = require("../models/Order")
const { zoneSoftOrder } = require("./zonesoftController")

const webhookConnection = async (req, res) => {
    console.log("Recebendo verificação do webhook...", req.params)
    res.status(200).json({ Key: verificationToken })
}

const webhookPaymentCreated = async (data) => {
    console.log("Pagamento criado: ", data)
    await Webhook.create(data)

    const customerOrderCode = data.EventData?.OrderCode
    if (!customerOrderCode) {
        console.log("Nenhum OrderCode encontrado no EventData.")
        return
    }

    const updatedOrder = await Order.findOne({ orderCode: customerOrderCode })
    if (!updatedOrder) {
        console.log("Order não encontrada para o OrderCode:", customerOrderCode)
        return
    }

    updatedOrder.status = "Pago"
    await updatedOrder.save()
    console.log("Status da ordem atualizado para Pago:", updatedOrder.orderCode)

    try {
        console.log("Enviando pedido para ZoneSoft:", customerOrderCode)
        await zoneSoftOrder(
            { params: { orderCode: customerOrderCode } },
            {
                status: (code) => ({
                    json: (obj) => {
                        console.log(`zoneSoftOrder response status ${code}`, obj)
                    }
                })
            }
        )
    } catch (error) {
        console.error("Erro ao enviar pedido para ZoneSoft:", error)
    }
}

const webhookPaymentReversed = async (data) => {
    console.log("Um reembolso foi criado: ", data)
    await Webhook.create(data)
    // Lógica adicional para reembolso, se necessário
}

const webhookPaymentFailed = async (data) => {
    console.log("Um pagamento falhou: ", data)
    await Webhook.create(data)
    // Lógica adicional para falha de pagamento, se necessário
}

const webhookUnknownEvent = async (data) => {
    console.log("Evento não tratado:", data.EventTypeId)
    await Webhook.create(data)
}


const webhookEvents = async (req, res) => {
    try {
        const data = req.body
        console.log("Webhook recebido:", JSON.stringify(data, null, 2))

        res.status(200).json({ message: "Webhook recebido com sucesso." }) // Resposta rápida

        (async () => { // Processamento assíncrono
            switch (data.EventTypeId) {
                case 1796:
                    await webhookPaymentCreated(data)
                    break
                case 1797:
                    await webhookPaymentReversed(data)
                    break
                case 1798:
                    await webhookPaymentFailed(data)
                    break
                default:
                    await webhookUnknownEvent(data)
                    break
            }
        })().catch((err) => {
            console.error("Erro no processamento assíncrono do webhook:", err)
        })

    } catch (error) {
        console.error("Erro ao processar webhook: ", error)
        return res.status(500).json({ message: "Erro ao processar webhook" })
    }
}


module.exports = { webhookEvents, webhookConnection }