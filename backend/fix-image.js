const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('./models/Product');

dotenv.config({ path: './.env' });

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ecom')
    .then(async () => {
        console.log('Connected to MongoDB');

        // Find by name
        const product = await Product.findOne({ name: 'Solitaire Radiance Ring' });
        if (product) {
            console.log('Found product with ID:', product._id);
            product.images = ['https://www.thediamondtrust.co.uk/wp-content/uploads/2016/11/170.jpg'];
            await product.save();
            console.log('Successfully updated product image for:', product.name);
        } else {
            console.log('Product not found by name.');
        }

        process.exit(0);
    })
    .catch((err) => {
        console.error('Connection error:', err);
        process.exit(1);
    });
