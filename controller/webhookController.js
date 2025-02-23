const Webhook = require("../models/Webhook")
const Order = require("../models/Order")
const { zoneSoftOrder } = require("./zonesoftController")
const verificationToken = process.env.VERIFICATION_TOKEN

const webhookConnection = async (req, res) => {
    try {
        console.log("Recebendo verificação do webhook...", req.params)
        res.status(200).json({ Key: verificationToken })
    } catch (error) {
        console.error("Erro ao processar webhook: ", error)
        res.status(500).json({ message: "Erro ao processar webhook" })
    }
}

const webhookEvents = async (req, res) => {
    const data = req.body
    console.log("Webhook recebido: ", data)

    try {
        switch (data.EventTypeId) {
            case 1796: // Transaction Payment Created
                console.log("O pagamento do cliente foi efetuado com sucesso: ", data)
                console.log("Processando evento de Pagamento Criado...")

                const customerOrderCode = data.EventData?.OrderCode
                if (!customerOrderCode) {
                    console.log("OrderCode não encontrado no webhook data.")
                    return res.status(400).json({ message: "OrderCode não encontrado" })
                }

                const updatedOrder = await Order.findOne({ orderCode: customerOrderCode })
                if (!updatedOrder) {
                    console.log(`Nenhuma ordem encontrada com o OrderCode: ${customerOrderCode}`)
                    return res.status(404).json({ message: "Ordem não encontrada" })
                }

                // Salva o webhook apenas quando o pagamento é confirmado
                const newWebhook = new Webhook(data)
                await newWebhook.save()
                console.log("Evento de pagamento salvo com sucesso: ", newWebhook)

                // Atualiza o status da ordem para Pago
                updatedOrder.status = 'Pago'
                await updatedOrder.save()
                console.log(`Status da ordem ${updatedOrder.orderCode} atualizado para Pago`)

                // Envia para ZoneSoft
                try {
                    console.log(`Iniciando envio para ZoneSoft: ${customerOrderCode}`)
                    await zoneSoftOrder({ params: { orderCode: customerOrderCode } }, {
                        status: (code) => ({
                            json: (obj) => {
                                console.log(`Simulated response with status ${code}`, obj)
                                return { success: true }
                            }
                        })
                    })
                } catch (error) {
                    console.error("Erro ao enviar para ZoneSoft:", error)
                    return res.status(500).json({ message: "Erro ao enviar para ZoneSoft" })
                }

                return res.status(200).json({ message: "Webhook processado com sucesso" })

            case 1797: // Transaction Reversal Created
                console.log("Um reembolso do cliente foi efetuado com sucesso: ", data)
                return res.status(200).json({ message: "Reembolso registrado" })

            case 1798: // Transaction Payment Failed
                console.log("O pagamento de um cliente falhou: ", data)
                return res.status(200).json({ message: "Falha no pagamento registrada" })

            default:
                console.log("Evento desconhecido: ", data)
                return res.status(400).json({ message: "Evento desconhecido" })
        }
    } catch (error) {
        console.error("Erro ao processar webhook: ", error)
        return res.status(500).json({ message: "Erro ao processar webhook", error: error.message })
    }
}

module.exports = { webhookEvents, webhookConnection }
