// const mongoose = require("mongoose");
// const AutoIncrement = require("mongoose-sequence")(mongoose);

// const orderSchema = new mongoose.Schema(
//     {
//         user: {
//             type: mongoose.Schema.Types.ObjectId,
//             ref: "Customer",
//             required: false,
//         },
//         email: {
//             type: String,
//             required: false
//         },
//         invoice: {
//             type: Number,
//             required: false,
//         },
//         cart: [{}],
//         // Dados customizados inicio -->
//         orderCode: {
//             type: Number,
//             required: false,
//         },
//         customerTrns: [{}],
//         merchantTrns: {
//             type: String,
//             required: false,
//         },
//         dynamicDescriptor: {
//             type: String,
//             required: false,
//         },
//         amount: {
//             type: Number,
//             required: false,
//         },
//         paymentNotification: {
//             type: Boolean,
//             required: false,
//         },
//         // Dados customizados fim -->
//         user_info: {
//             name: {
//                 type: String,
//                 required: false,
//             },
//             email: {
//                 type: String,
//                 required: false,
//             },
//             contact: {
//                 type: String,
//                 required: false,
//             },
//             address: {
//                 type: String,
//                 required: false,
//             },
//             city: {
//                 type: String,
//                 required: false,
//             },
//             country: {
//                 type: String,
//                 required: false,
//             },
//             zipCode: {
//                 type: String,
//                 required: false,
//             },
//         },
//         subTotal: {
//             type: Number,
//             required: false,
//         },
//         total: {
//             type: Number,
//             required: false,
//         },
//         shippingCost: {
//             type: Number,
//             required: false,
//         },
//         discount: {
//             type: Number,
//             required: false,
//             default: 0,
//         },
//         shippingOption: {
//             type: String,
//             required: false,
//         },
//         paymentMethod: {
//             type: String,
//             required: false,
//         },
//         cardInfo: {
//             type: Object,
//             required: false,
//         },
//         status: {
//             type: String,
//             enum: ["Pendente", "Pago", "Cancelado"],
//         },
//         localizacao: {
//             type: Object,
//             required: false,
//         },
//         pagamentoNaEntrega: {
//             type: Boolean,
//             required: false
//         },
//         paymentMethodDetails: {
//             type: Object,
//             required: false,
//         },
//         agendamento: {
//             type: Object,
//             required: false,
//         }
//     },
//     {
//         timestamps: true,
//     }
// );

// const Order = mongoose.model(
//     "Order",
//     orderSchema.plugin(AutoIncrement, {
//         inc_field: "invoice",
//         start_seq: 10000,
//     })
// );
// module.exports = Order;


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
        extras: [String],
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
    additionalInformation: String,
    zoneSoftId: String,
    pagamentoNaEntrega: String,
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
