const mongoose = require("mongoose");
const AutoIncrement = require("mongoose-sequence")(mongoose);

const orderSchema = new mongoose.Schema({
    cart: [{
        _id: String,
        productId: String,
        title: String,
        slug: String,
        image: String,
        variant: Object,
        price: Number,
        originalPrice: Number,
        quantity: Number,
        itemTotal: Number,
        category: Object
    }],
    user_info: {
        name: String,
        email: String,
        contact: String,
        address: String,
        city: String,
        country: String,
        zipCode: String,
        nif: String
    },
    amount: Number,
    customerTrns: [String],
    merchantTrns: String,
    dynamicDescriptor: String,
    paymentNotification: Boolean,
    status: {
        type: String,
        enum: ["Pendente", "Pago", "Cancelado"]
    },
    subTotal: Number,
    shippingCost: Number,
    discount: Number,
    total: Number,
    agendamento: {
        data: Date,
        horario: String
    },
    localizacao: {
        latitude: String,
        longitude: String
    },
    pagamentoNaEntrega: Boolean,
    paymentMethodDetails: {
        method: String,
        changeFor: String
    },
    orderCode: Number,
    invoice: Number
}, {
    timestamps: true
})


const Order = mongoose.model(
    "Order",
    orderSchema.plugin(AutoIncrement, {
        inc_field: "invoice",
        start_seq: 10000,
    })
);
module.exports = Order;
