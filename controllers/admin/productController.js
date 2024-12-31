const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const fs = require("fs");
const multer = require("multer");
const path = require("path");
const sharp = require("sharp");
const Order=require("../../models/orderSchema")
const Address=require("../../models/addressSchema")

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, "../../public/uploads/re-image"));
    },
    filename:(req,file,cb)=>{
        cb(null,Date.now() +"-"+ file.originalname);
    }
});

const uploads = multer({ storage: storage }); 

//add product page load
const productaddpage = async (req, res) => {
    try {
        const category = await Category.find({ isListed: true });
        res.render("product-load", { cat: category, error: null,success:null});
    } catch (error) {
        console.log("Error:", error);
        res.redirect("/pagenotfound");
    }
};
//add product
const addProduct = async (req,res) => {
    try {
        const products = req.body;
        const categories = await Category.find({ isListed: true });
        const productExists = await Product.findOne({
            productName:products.productName
        })


        if(!productExists){
            const images = [];
            
            if(req.files && req.files.length > 0) {
                for (let i = 0; i < req.files.length; i++) {
                    const originalImagePath = req.files[i].path;
                    const resizedImagePath = path.join("public", "uploads", "product-images", req.files[i].filename);
                    await sharp(originalImagePath).resize({ width: 440, height: 440 }).toFile(resizedImagePath);
                    images.push(req.files[i].filename);
                }
            }
            

            const categoryId = await Category.findOne({name:products.category})

            if(!categoryId){
                return res.render("product-load",{cat:categories,error:"Invalid category name",success:null})
            }

            const newProduct = new Product({
                productName:products.productName,
                description:products.description,
                category:categoryId._id,
                regularPrice:products.regularPrice,
                salePrice:products.salePrice,
                createdAt:new Date(),
                quantity:products.quantity,
                size:products.size,
                color:products.color,
                productImage:images,
                status:"Available",
            })

            await newProduct.save();
            return res.render("product-load",{cat:categories,error:null,success:"product saved sucessfully"})

        }else{
            
            return res.render("product-load",{cat:categories,error:"product already exist",success:null})
        }

    } catch (error) {
        console.error("Error adding product",error)
        res.redirect('/pagenotfound')
    }
}


const getproduct = async (req, res) => {
    try {
        const search = req.query.search || ""; // Default to an empty string if search is not provided
        const page = parseInt(req.query.page, 10) || 1; // Default to page 1
        const limit = parseInt(req.query.limit, 10) || 4; // Default to 10 items per page

        // Create a search query for product name or brand
        const searchQuery = search
            ? { $or: [{ productName: { $regex: search, $options: "i" } }] }
            : {};

        // Fetch products with pagination and populate the category
        const productData = await Product.find(searchQuery)
            .populate("category")
            .skip((page - 1) * limit)
            .limit(limit);

        // Fetch total count for pagination
        const totalProducts = await Product.countDocuments(searchQuery);

        const category = await Category.find({ isListed: true });

        if (category) {
            res.render("products", {
                data: productData,
                cat: category,
                currentPage: page,
                totalPages: Math.ceil(totalProducts / limit),
                search: search,
            });
        } else {
            res.redirect("/pagenotfound");
        }
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).send("Internal Server Error");
    }
};


//unblockproduct
const blockproduct=async(req,res)=>{
    try {
        let id=req.query.id
        await Product.updateOne({_id:id},{$set:{isBlocked:true}})
        res.redirect("/admin/products")
    } catch (error) {
        res.redirect("/pagenotfound")
        console.log("error",error)
    }
}
//blockproduct
const unblockproduct=async(req,res)=>{
    try {
        let id=req.query.id
        await Product.updateOne({_id:id},{$set:{isBlocked:false}})
        res.redirect("/admin/products")
    } catch (error) {
        res.redirect("/pagenotfound")
        console.log("error",error)
    }
}

//get edit product
const getEditProduct = async (req,res) => {
    try {
        
        const id = req.query.id;
        const product = await Product.findOne({_id:id});
        const category = await Category.find({});
        res.render('edit-product',{
            product:product,
            cat:category,
             message:"",
        });

    } catch (error) {
        console.log("message",error)
        res.redirect('/admin/pageerror');
    }
}

//edit Product
const editProduct=async(req,res)=>{
    try {
        const id = req.params.id;
        const product = await Product.findOne({_id:id});
        const data = req.body;
        const tempcat=await Category.find({})
        const existingProduct = await Product.findOne({
            productName:data.productName,
            _id:{$ne:id}
        })
        if (existingProduct) {
            return res.render('edit-product', {
                message: "Product with this name already exists. Please try with another name",
                product: product,
                cat: tempcat
            });
        }

        const images = [];

        const category = await Category.findOne({name:data.category})

        if (req.files && Array.isArray(req.files) && req.files.length > 0) {
            req.files.forEach(file => {
                images.push(file.filename);
            });
        }

        const updateFields = {
            productName:data.productName,
            description:data.description,
            category:category._id,
            regularPrice:data.regularPrice,
            salePrice:data.salePrice,
            quantity:data.quantity,
            color:data.color
        }

        if(req.files.length>0){
            updateFields.$push = {productImage:{$each:images}};
        }

        await Product.findByIdAndUpdate(id,updateFields,{new:true});
        res.redirect('/admin/products');

    } catch (error) {
        console.error(error);
        res.redirect('/admin/pageerror')
    }
}

//load orders

const orders = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 4; 
        const page = parseInt(req.query.page) || 1; 
        const skip = (page - 1) * limit;

        const totalOrders = await Order.countDocuments(); 
        const orders = await Order.find()
            .populate("userId")
            .populate({
                path: "orderedItem.product",
                select: "productName salePrice",
            })
            .sort({ createdOn: -1 })
            .skip(skip)
            .limit(limit);

        const totalPages = Math.ceil(totalOrders / limit);

        res.render("ordermanage", {
            orders,
            currentPage: page,
            totalPages,
            limit,
            successMessage: "",
            errorMessage: "",
        });
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).render("ordermanage", {
            orders: [],
            currentPage: 1,
            totalPages: 1,
            limit: 4,
            successMessage: "",
            errorMessage: "Failed to load orders",
        });
    }
};



//update orderstatus
const updateorderstatus = async (req, res) => {
    try {
        const { orderId, status } = req.body;
    
        if (!['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
            return res.json({ success: false, message: 'Invalid status value' });
        }
    
        const order = await Order.findOne({ orderId });
    
        if (!order) {
            return res.json({ success: false, message: 'Order not found' });
        }
    
        if (order.status === 'delivered' || order.status ==="cancelled") {
            return res.json({ success: false, message: 'Cannot update status for delivered orders' });
        }
    
        order.status = status;
        await order.save();
    
        res.json({ success: true, message: 'Order status updated successfully' });
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: 'An error occurred while updating order status' });
    }
};

//load stock
const loadstock=async(req,res)=>{
    try {
        const page=parseInt(req.query.page)||1
        const limit=parseInt(req.query.limit)||5
        const skip=(page-1)*limit

        const products = await Product.find()
        .populate("category")
        .skip(skip)
        .limit(limit); 
        const totalProducts=await Product.countDocuments()
        const totalPages=Math.ceil(totalProducts/limit)
        res.render("stockmanage", {
            products: products,
            currentPage:page,
            totalPages,
            limit
        });
    } catch (error) {
        console.error(error);
        res.render('stockmanage', {
            errorMessage: 'An error occurred while fetching product data.'
        });
    }
}

//updatestock
const updatestock=async(req,res)=>{
    try {
        const productId=req.params.productId
        console.log(productId);
        const { quantity } = req.body;

        const product = await Product.findById(productId);
        
        if (!product) {
            return res.json({ success: false, message: 'Product not found' });
        }

        product.quantity = quantity;  // Update the stock quantity

        await product.save();
        return res.json({ success: true, message: 'Stock updated successfully' });
    } catch (error) {
        console.error(error);
        return res.json({ success: false, message: 'An error occurred while updating the stock' });
    }
}



const addProductOffer = async (req, res) => {
    try {
        const { productId, percentage } = req.body;

        // Fetch the product by ID
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ status: false, message: "Product not found" });
        }

        // Fetch the category associated with the product
        const category = await Category.findById(product.category);
        if (category && category.categoryOffer > 0) {
            return res.status(400).json({
                status: false,
                message: "Cannot set product offer. The category already has an active offer.",
            });
        }

        // Set the product offer
       
        const productOffer = parseInt(percentage, 10);
        product.productOffer = productOffer;
        product.salePrice = product.salePrice - Math.floor(product.salePrice * (productOffer / 100));

        // Save the updated product
        await product.save();

        return res.json({ status: true ,message:"product Added successfully"});
    } catch (error) {
        console.error("Error in addProductOffer:", error);
        return res.status(500).json({ status: false, message: "Internal Server Error" });
    }
};


const removeProductOffer = async (req, res) => {
    try {
        const { productId } = req.body;

        // Fetch the product by ID
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ status: false, message: "Product not found" });
        }

        // Check if the product has an active offer
        if (product.productOffer === 0) {
            return res.status(400).json({
                status: false,
                message: "No active product offer to remove.",
            });
        }

        // Revert the sale price to its original price before the product-specific offer
        const offerPercentage = product.productOffer;
        product.salePrice = product.salePrice / (1 - offerPercentage / 100);

        // Reset the product offer
        product.productOffer = 0;

        // Save the updated product
        await product.save();

        // Return the updated product data
        return res.status(200).json({
            status: true,
            message: "Product offer removed successfully",
            product, // Include updated product data
        });
    } catch (error) {
        console.error("Error in removeProductOffer:", error);
        return res.status(500).json({ status: false, message: "Internal Server Error" });
    }
};



//delete single image

const deleteSingleImage = async (req,res) => {
    try {

        const {imageNameToServer,productIdToServer} = req.body;
        console.log({imageNameToServer,productIdToServer},"this is the data from deletion")
        const product = await Product.findByIdAndUpdate(productIdToServer,{$pull:{productImage:imageNameToServer}});
        const imagePath = path.join("public","uploads","re-image",imageNameToServer);
        if(fs.existsSync(imagePath)){
            await fs.unlinkSync(imagePath);
            console.log(`Image ${imageNameToServer} deleted succefully`);
        }else{
            console.log(`Imaage ${imageNameToServer} not found`);
        }
        res.send({status:true});
        
    } catch (error) {
        console.log("error",error)
    }
}

//order detailed page

const loadOrderDetails = async (req, res) => {
    try {
        const { id } = req.params; // Order ID passed in the URL

        // Fetch the order
        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).render('404', { message: 'Order not found' });
        }

        // Fetch user details
        const user = await User.findById(order.userId);

        // Fetch address details
        const address = await Address.findOne(
            { userId: order.userId, "address._id": order.address },
            { "address.$": 1 } // Fetch only the specific address
        );

        // Fetch ordered products
        const orderedItems = await Promise.all(
            order.orderedItem.map(async (item) => {
                const product = await Product.findById(item.product);
                return {
                    ...item._doc,
                    productName: product?.productName || 'Product not found',
                    productImage: product?.productImage || ['default.jpg'],
                    regularPrice: product?.regularPrice,
                };
            })
        );

        // Render the order details page
        res.render('orderdetails', {
            user,
            order,
            address: address?.address[0], // Single address object
            orderedItems,
        });
    } catch (error) {
        console.error(error);
        res.status(500).render('500', { message: 'Internal Server Error' });
    }
};




module.exports = {
    productaddpage,
    addProduct,
    uploads,
    getproduct,
    blockproduct,
    unblockproduct,
    orders,
    updateorderstatus,
    loadstock,
    updatestock,
    getEditProduct,
    editProduct,
    addProductOffer,
    removeProductOffer,
    deleteSingleImage,
    loadOrderDetails
};
