// models/Menu.js
const mongoose = require("mongoose");

const menuSchema = new mongoose.Schema(
    {
        families: {
            type: Array,
            required: true,
        },
        // Você pode adicionar outros campos, como data de sincronização, status, etc.
    },
    { timestamps: true }
);

const Menu = mongoose.model("Menu", menuSchema);
module.exports = Menu;
